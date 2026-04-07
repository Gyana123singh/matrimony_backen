// Handle user status and online/offline socket events
const User = require("../models/User");

// Track user status: { userId: { status, lastActive, socketIds: Set<string> } }
const userStatusMap = {};

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

      // Track in memory - support multiple sockets per user
      if (!userStatusMap[userId]) {
        userStatusMap[userId] = {
          status: "online",
          lastActive: new Date(),
          socketIds: new Set(),
        };
      }
      userStatusMap[userId].socketIds.add(socket.id);
      userStatusMap[userId].status = "online";
      userStatusMap[userId].lastActive = new Date();

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

      // Remove this socket from the user's socket set
      if (userStatusMap[userId] && userStatusMap[userId].socketIds) {
        userStatusMap[userId].socketIds.delete(socket.id);
      }

      // If no sockets left, mark offline in DB and memory, and broadcast
      const socketsLeft = userStatusMap[userId]
        ? userStatusMap[userId].socketIds.size
        : 0;

      if (socketsLeft === 0) {
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastActive: new Date(),
        });

        if (userStatusMap[userId]) {
          userStatusMap[userId].status = "offline";
          userStatusMap[userId].lastActive = new Date();
        }

        io.emit("user:statusChanged", {
          userId,
          status: "offline",
          lastActive: new Date(),
          timestamp: new Date(),
        });
      }
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

  // Handle socket disconnect - mark user offline if this socket belonged to them
  socket.on("disconnect", async () => {
    try {
      // find any userId that has this socket id and remove it
      const entries = Object.entries(userStatusMap).filter(([, v]) =>
        v.socketIds && v.socketIds.has && v.socketIds.has(socket.id),
      );

      for (const [userId, v] of entries) {
        v.socketIds.delete(socket.id);

        const socketsLeft = v.socketIds.size;
        if (socketsLeft === 0) {
          // update DB and memory
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastActive: new Date(),
          });

          v.status = "offline";
          v.lastActive = new Date();

          // broadcast status change
          io.emit("user:statusChanged", {
            userId,
            status: "offline",
            lastActive: new Date(),
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.error("Error handling disconnect in statusEvents:", error);
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
