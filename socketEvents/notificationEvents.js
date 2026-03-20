// Handle all notification-related socket events
const Notification = require("../models/Notification");

const registerNotificationEvents = (io, socket) => {
  // Send notification
  socket.on("notification:send", async (data) => {
    try {
      const { userId, type, title, message, relatedId, relatedType } = data;

      const notification = new Notification({
        user: userId,
        type, // 'interest', 'message', 'match', 'visit', 'custom'
        title,
        message,
        relatedId,
        relatedType,
        isRead: false,
        createdAt: new Date(),
      });

      await notification.save();

      // Emit to user
      io.to(`user:${userId}`).emit("notification:new", {
        _id: notification._id,
        type,
        title,
        message,
        relatedId,
        relatedType,
        createdAt: notification.createdAt,
      });
    } catch (error) {
      socket.emit("error", {
        type: "notification:send",
        message: error.message,
      });
    }
  });

  // Mark notification as read
  socket.on("notification:read", async (data) => {
    try {
      const { notificationId } = data;

      await Notification.findByIdAndUpdate(notificationId, {
        isRead: true,
        readAt: new Date(),
      });

      socket.emit("notification:read:confirmation", {
        notificationId,
        isRead: true,
      });
    } catch (error) {
      socket.emit("error", {
        type: "notification:read",
        message: error.message,
      });
    }
  });

  // Mark all notifications as read
  socket.on("notification:readAll", async (data) => {
    try {
      const { userId } = data;

      await Notification.updateMany(
        { user: userId, isRead: false },
        { isRead: true, readAt: new Date() },
      );

      socket.emit("notification:readAll:confirmation", {
        message: "All notifications marked as read",
      });
    } catch (error) {
      socket.emit("error", {
        type: "notification:readAll",
        message: error.message,
      });
    }
  });

  // Get unread count
  socket.on("notification:getUnreadCount", async (data) => {
    try {
      const { userId } = data;

      const count = await Notification.countDocuments({
        user: userId,
        isRead: false,
      });

      socket.emit("notification:unreadCount", {
        count,
      });
    } catch (error) {
      socket.emit("error", {
        type: "notification:getUnreadCount",
        message: error.message,
      });
    }
  });

  // Get notifications list
  socket.on("notification:getList", async (data) => {
    try {
      const { userId, limit = 20, skip = 0 } = data;

      const notifications = await Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const total = await Notification.countDocuments({ user: userId });

      socket.emit("notification:list", {
        notifications,
        total,
        hasMore: skip + limit < total,
      });
    } catch (error) {
      socket.emit("error", {
        type: "notification:getList",
        message: error.message,
      });
    }
  });

  // Delete notification
  socket.on("notification:delete", async (data) => {
    try {
      const { notificationId } = data;

      await Notification.findByIdAndDelete(notificationId);

      socket.emit("notification:deleted", {
        notificationId,
      });
    } catch (error) {
      socket.emit("error", {
        type: "notification:delete",
        message: error.message,
      });
    }
  });

  // Delete all notifications
  socket.on("notification:deleteAll", async (data) => {
    try {
      const { userId } = data;

      await Notification.deleteMany({ user: userId });

      socket.emit("notification:deletedAll", {
        message: "All notifications deleted",
      });
    } catch (error) {
      socket.emit("error", {
        type: "notification:deleteAll",
        message: error.message,
      });
    }
  });
};

module.exports = registerNotificationEvents;
