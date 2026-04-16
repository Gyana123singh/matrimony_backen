const Message = require("../../models/Message");
const User = require("../../models/User");

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId, content, attachments } = req.body;

    if (!content && !attachments) {
      return res.status(400).json({ message: "Message content required" });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // Check if sender is blocked
    if (receiver.blockedUsers.includes(senderId)) {
      return res.status(403).json({ message: "You are blocked by this user" });
    }

    const message = new Message({
      senderId,
      receiverId,
      content,
      attachments: attachments || [],
    });

    // If files were uploaded via multer (Cloudinary storage), map their URLs
    if (req.files && req.files.length > 0) {
      try {
        const fileUrls = req.files.map((f) => f.path || f.secure_url || f.url || f.filename);
        message.attachments = (message.attachments || []).concat(fileUrls || []);
      } catch (e) {
        console.error('Error mapping uploaded files:', e.message);
      }
    }

    await message.save();

    // Emit socket events for real-time delivery
    try {
      const io = req.app.get('io')
      if (io) {
        io.to(`user:${receiverId}`).emit('message:receive', {
          _id: message._id,
          senderId,
          receiverId,
          content: message.content,
          attachments: message.attachments,
          timestamp: message.createdAt || new Date(),
        })
        // Also emit the same receive event to the sender so sender UI can
        // render the persisted message (helps when optimistic UI didn't match)
        io.to(`user:${senderId}`).emit('message:receive', {
          _id: message._id,
          senderId,
          receiverId,
          content: message.content,
          attachments: message.attachments,
          timestamp: message.createdAt || new Date(),
        })

        // Notify sender about delivery confirmation
        io.to(`user:${senderId}`).emit('message:delivered', {
          messageId: message._id,
          status: 'delivered',
          content: message.content,
        })
      }
    } catch (err) {
      console.error('Socket emit error:', err.message)
    }

    res.status(201).json({
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get messages with a user
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId, page = 1, limit = 20 } = req.query;

    const query = {
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    };

    const skip = (page - 1) * limit;

    const messages = await Message.find(query)
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .populate("senderId", "firstName lastName profilePhoto")
      .populate("receiverId", "firstName lastName profilePhoto");

    const total = await Message.countDocuments(query);


    // Mark messages as read - find unread first so we can notify senders
    const unreadMessages = await Message.find({ receiverId: userId, senderId: otherUserId, isRead: false })
    const unreadIds = unreadMessages.map(m => m._id)

    if (unreadIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: unreadIds } },
        { $set: { isRead: true, readAt: new Date() } },
      )

      // Emit read confirmations to sender via socket
      try {
        const io = req.app.get('io')
        if (io) {
          unreadIds.forEach(id => {
            io.to(`user:${otherUserId}`).emit('message:read:confirmation', {
              messageId: id,
              readAt: new Date(),
            })
          })
        }
      } catch (err) {
        console.error('Socket emit error (read confirmations):', err.message)
      }
    }

    res.status(200).json({
      message: "Messages retrieved successfully",
      messages,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get conversations (list of users talked to)
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            conversationId: {
              $cond: [
                { $lt: ["$senderId", "$receiverId"] },
                {
                  $concat: [
                    { $toString: "$senderId" },
                    "-",
                    { $toString: "$receiverId" },
                  ],
                },
                {
                  $concat: [
                    { $toString: "$receiverId" },
                    "-",
                    { $toString: "$senderId" },
                  ],
                },
              ],
            },
            otherUserId: {
              $cond: [
                { $eq: ["$senderId", userId] },
                "$receiverId",
                "$senderId",
              ],
            },
          },
          lastMessage: { $first: "$content" },
          lastMessageAt: { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", userId] },
                    { $eq: ["$isRead", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id.otherUserId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $sort: { lastMessageAt: -1 },
      },
    ]);

    res.status(200).json({
      message: "Conversations retrieved successfully",
      conversations,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Message.findByIdAndDelete(messageId);

    // Emit deletion event to receiver
    try {
      const io = req.app.get('io')
      if (io) {
        io.to(`user:${message.receiverId}`).emit('message:deleted', {
          messageId,
        })
      }
    } catch (err) {
      console.error('Socket emit error (delete):', err.message)
    }

    res.status(200).json({
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark message as read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;

    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        isRead: true,
        readAt: new Date(),
      },
      { returnDocument: 'after' },
    );

    // Emit read confirmation to sender via socket
    try {
      const io = req.app.get('io')
      if (io && message && message.senderId) {
        io.to(`user:${message.senderId}`).emit('message:read:confirmation', {
          messageId: message._id,
          readAt: message.readAt || new Date(),
        })
      }
    } catch (err) {
      console.error('Socket emit error (markAsRead):', err.message)
    }

    res.status(200).json({
      message: "Message marked as read",
      data: message,
    });
  } catch (error) {
    console.error("Error marking message:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Edit message content
exports.editMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (String(message.senderId) !== String(userId)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    message.content = content || message.content;
    message.edited = true;
    message.editedAt = new Date();

    await message.save();

    // Emit update event to both participants
    try {
      const io = req.app.get('io');
      if (io) {
        const payload = {
          messageId: message._id,
          content: message.content,
          edited: message.edited,
          editedAt: message.editedAt,
          senderId: message.senderId,
          receiverId: message.receiverId,
          timestamp: message.createdAt || new Date(),
        };

        io.to(`user:${message.receiverId}`).emit('message:updated', payload);
        io.to(`user:${message.senderId}`).emit('message:updated', payload);
      }
    } catch (err) {
      console.error('Socket emit error (edit):', err.message);
    }

    res.status(200).json({ message: 'Message updated', data: message });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
