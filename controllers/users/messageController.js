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

    await message.save();

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

    // Mark messages as read
    await Message.updateMany(
      { receiverId: userId, senderId: otherUserId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );

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
      { new: true },
    );

    res.status(200).json({
      message: "Message marked as read",
      data: message,
    });
  } catch (error) {
    console.error("Error marking message:", error);
    res.status(500).json({ message: "Server error" });
  }
};
