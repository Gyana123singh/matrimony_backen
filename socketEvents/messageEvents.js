// Handle all message-related socket events
const Message = require("../models/Message");
const User = require("../models/User");

const registerMessageEvents = (io, socket) => {
  // Send message event
  socket.on("message:send", async (data) => {
    try {
      const { senderId, receiverId, content, attachments = [] } = data;

      // Save message to database
      const message = new Message({
        sender: senderId,
        receiver: receiverId,
        content,
        attachments,
        timestamp: new Date(),
      });

      await message.save();

      // Emit to receiver
      io.to(`user:${receiverId}`).emit("message:receive", {
        _id: message._id,
        senderId,
        receiverId,
        content,
        attachments,
        timestamp: message.timestamp,
      });

      // Emit delivery confirmation
      socket.emit("message:delivered", {
        messageId: message._id,
        status: "delivered",
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
      const { messageId, receiverId } = data;

      await Message.findByIdAndUpdate(messageId, { isRead: true });

      // Notify sender that message was read
      io.to(`user:${receiverId}`).emit("message:read:confirmation", {
        messageId,
        readAt: new Date(),
      });
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
      const { messageId, senderId, receiverId } = data;

      await Message.findByIdAndDelete(messageId);

      io.to(`user:${receiverId}`).emit("message:deleted", {
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
          { sender: userId, receiver: otherUserId },
          { sender: otherUserId, receiver: userId },
        ],
      })
        .sort({ timestamp: -1 })
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
