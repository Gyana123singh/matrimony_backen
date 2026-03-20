// Handle profile view and visitor tracking socket events
const User = require("../models/User");

const userVisitors = {}; // Track active visitors: { userId: Set of visitor IDs }

const registerVisitorEvents = (io, socket) => {
  // Notify profile view
  socket.on("profile:view", async (data) => {
    try {
      const { viewerId, profileOwnerId } = data;

      // Record the view in database (if you have a ProfileView model)
      // await ProfileView.create({ viewer: viewerId, profileOwner: profileOwnerId });

      // Track in memory
      if (!userVisitors[profileOwnerId]) {
        userVisitors[profileOwnerId] = new Set();
      }
      userVisitors[profileOwnerId].add(viewerId);

      // Notify profile owner
      io.to(`user:${profileOwnerId}`).emit("visitor:new", {
        visitorId: viewerId,
        visitorName: (await User.findById(viewerId))?.firstName,
        viewedAt: new Date(),
      });

      // Confirm to viewer
      socket.emit("profile:viewConfirmed", {
        profileOwnerId,
        viewedAt: new Date(),
      });
    } catch (error) {
      socket.emit("error", {
        type: "profile:view",
        message: error.message,
      });
    }
  });

  // Get visitors list
  socket.on("visitor:getList", async (data) => {
    try {
      const { userId } = data;

      const visitorIds = Array.from(userVisitors[userId] || []);
      const visitors = await User.find(
        { _id: { $in: visitorIds } },
        "firstName lastName profilePhoto gender age",
      );

      socket.emit("visitor:list", {
        visitors,
        total: visitors.length,
      });
    } catch (error) {
      socket.emit("error", {
        type: "visitor:getList",
        message: error.message,
      });
    }
  });

  // Clear visitors for a user
  socket.on("visitor:clear", (data) => {
    try {
      const { userId } = data;
      if (userVisitors[userId]) {
        userVisitors[userId].clear();
      }

      socket.emit("visitor:cleared", {
        userId,
      });
    } catch (error) {
      socket.emit("error", {
        type: "visitor:clear",
        message: error.message,
      });
    }
  });

  // Get visitor count
  socket.on("visitor:getCount", (data) => {
    try {
      const { userId } = data;
      const count = userVisitors[userId]?.size || 0;

      socket.emit("visitor:count", {
        count,
      });
    } catch (error) {
      socket.emit("error", {
        type: "visitor:getCount",
        message: error.message,
      });
    }
  });

  // Remove specific visitor tracking
  socket.on("visitor:remove", (data) => {
    try {
      const { userId, visitorId } = data;
      if (userVisitors[userId]) {
        userVisitors[userId].delete(visitorId);
      }

      socket.emit("visitor:removed", {
        visitorId,
      });
    } catch (error) {
      socket.emit("error", {
        type: "visitor:remove",
        message: error.message,
      });
    }
  });
};

module.exports = registerVisitorEvents;
