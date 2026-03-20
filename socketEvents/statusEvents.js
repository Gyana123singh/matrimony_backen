// Handle user status and online/offline socket events
const User = require("../models/User");

const userStatusMap = {}; // Track user status: { userId: { status, lastActive } }

const registerStatusEvents = (io, socket) => {
  // User comes online
  socket.on("user:online", async (data) => {
    try {
      const { userId } = data;

      // Update user status in database
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastActive: new Date(),
      });

      // Track in memory
      userStatusMap[userId] = {
        status: "online",
        lastActive: new Date(),
        socketId: socket.id,
      };

      // Broadcast to all users
      io.emit("user:statusChanged", {
        userId,
        status: "online",
        timestamp: new Date(),
      });

      socket.emit("user:online:confirmed", {
        userId,
        status: "online",
      });
    } catch (error) {
      socket.emit("error", {
        type: "user:online",
        message: error.message,
      });
    }
  });

  // User goes offline
  socket.on("user:offline", async (data) => {
    try {
      const { userId } = data;

      // Update user status in database
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastActive: new Date(),
      });

      // Update in memory
      if (userStatusMap[userId]) {
        userStatusMap[userId].status = "offline";
        userStatusMap[userId].lastActive = new Date();
      }

      // Broadcast to all users
      io.emit("user:statusChanged", {
        userId,
        status: "offline",
        lastActive: new Date(),
        timestamp: new Date(),
      });
    } catch (error) {
      socket.emit("error", {
        type: "user:offline",
        message: error.message,
      });
    }
  });

  // Get user status
  socket.on("user:getStatus", async (data) => {
    try {
      const { userId } = data;

      const user = await User.findById(userId, "isOnline lastActive");
      const status = userStatusMap[userId] || { status: "offline" };

      socket.emit("user:status", {
        userId,
        isOnline: user?.isOnline || false,
        lastActive: user?.lastActive,
        status: status.status,
      });
    } catch (error) {
      socket.emit("error", {
        type: "user:getStatus",
        message: error.message,
      });
    }
  });

  // Get multiple users status
  socket.on("user:getStatusBatch", async (data) => {
    try {
      const { userIds } = data;

      const users = await User.find(
        { _id: { $in: userIds } },
        "isOnline lastActive",
      );

      const statusMap = {};
      users.forEach((user) => {
        statusMap[user._id] = {
          isOnline: user.isOnline,
          lastActive: user.lastActive,
        };
      });

      socket.emit("user:statusBatch", {
        statuses: statusMap,
      });
    } catch (error) {
      socket.emit("error", {
        type: "user:getStatusBatch",
        message: error.message,
      });
    }
  });

  // Update last active timestamp
  socket.on("user:updateActivity", async (data) => {
    try {
      const { userId } = data;

      await User.findByIdAndUpdate(userId, {
        lastActive: new Date(),
      });

      if (userStatusMap[userId]) {
        userStatusMap[userId].lastActive = new Date();
      }

      socket.emit("user:activityUpdated", {
        userId,
        lastActive: new Date(),
      });
    } catch (error) {
      socket.emit("error", {
        type: "user:updateActivity",
        message: error.message,
      });
    }
  });

  // Set custom status
  socket.on("user:setStatus", async (data) => {
    try {
      const { userId, customStatus } = data;

      await User.findByIdAndUpdate(userId, {
        customStatus,
      });

      // Broadcast new status to followers
      io.emit("user:customStatusChanged", {
        userId,
        customStatus,
        timestamp: new Date(),
      });

      socket.emit("user:statusSet", {
        userId,
        customStatus,
      });
    } catch (error) {
      socket.emit("error", {
        type: "user:setStatus",
        message: error.message,
      });
    }
  });
};

module.exports = registerStatusEvents;
