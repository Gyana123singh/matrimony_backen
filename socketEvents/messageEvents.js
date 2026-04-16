// Handle all message-related socket events
const Message = require("../models/Message");
const User = require("../models/User");

const registerMessageEvents = (io, socket) => {
  // Send message event
  socket.on("message:send", async (data) => {
    try {
      const { senderId, receiverId, content, attachments = [] } = data;

      if (!senderId || !receiverId || !content) {
        socket.emit("error", {
          type: "message:send",
          message: "Invalid message payload",
        });
        return;
      }

      // Save message to database (Message schema uses senderId/receiverId)
      const message = new Message({
        senderId,
        receiverId,
        content,
        attachments,
      });

      await message.save();

      // Emit to receiver's room
      io.to(`user:${receiverId}`).emit("message:receive", {
        _id: message._id,
        senderId,
        receiverId,
        content: message.content,
        attachments: message.attachments,
        timestamp: message.createdAt || new Date(),
      });

      // Emit delivery confirmation to sender's room (in case of multiple sockets)
      io.to(`user:${senderId}`).emit("message:delivered", {
        messageId: message._id,
        status: "delivered",
        content: message.content,
      });
    } catch (error) {
      socket.emit("error", {
        type: "message:send",
        message: error.message,
      });
    }
  });

  // Mark message as read
  socket.on("message:read", async (data) => {
    try {
      const { messageId } = data;

      if (!messageId) {
        socket.emit("error", {
          type: "message:read",
          message: "messageId required",
        });
        return;
      }

      const message = await Message.findByIdAndUpdate(
        messageId,
        { isRead: true, readAt: new Date() },
        { returnDocument: 'after' },
      );

      if (message && message.senderId) {
        // Notify sender that message was read
        io.to(`user:${message.senderId}`).emit("message:read:confirmation", {
          messageId,
          readAt: message.readAt || new Date(),
        });
      }
    } catch (error) {
      socket.emit("error", {
        type: "message:read",
        message: error.message,
      });
    }
  });

  // Typing indicator
  socket.on("message:typing", (data) => {
    const { senderId, receiverId } = data;
    io.to(`user:${receiverId}`).emit("message:typing", {
      senderId,
      receiverId,
      isTyping: true,
    });
  });

  // Stop typing
  socket.on("message:stopTyping", (data) => {
    const { senderId, receiverId } = data;
    io.to(`user:${receiverId}`).emit("message:typing", {
      senderId,
      receiverId,
      isTyping: false,
    });
  });

  // Delete message
  socket.on("message:delete", async (data) => {
    try {
      const { messageId } = data;

      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit("error", {
          type: "message:delete",
          message: "Message not found",
        });
        return;
      }

      await Message.findByIdAndDelete(messageId);

      // Notify receiver that message was deleted
      io.to(`user:${message.receiverId}`).emit("message:deleted", {
        messageId,
      });
    } catch (error) {
      socket.emit("error", {
        type: "message:delete",
        message: error.message,
      });
    }
  });

  // Get conversation history
  socket.on("message:getConversation", async (data) => {
    try {
      const { userId, otherUserId, limit = 50, skip = 0 } = data;

      const messages = await Message.find({
        $or: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      socket.emit("message:conversationHistory", {
        messages: messages.reverse(),
        total: messages.length,
      });
    } catch (error) {
      socket.emit("error", {
        type: "message:getConversation",
        message: error.message,
      });
    }
  });
};

module.exports = registerMessageEvents;
