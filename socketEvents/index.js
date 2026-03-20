// Main socket event registration handler
const registerMessageEvents = require("./messageEvents");
const registerInterestEvents = require("./interestEvents");
const registerNotificationEvents = require("./notificationEvents");
const registerVisitorEvents = require("./visitorEvents");
const registerStatusEvents = require("./statusEvents");
const registerAdminEvents = require("./adminEvents");

const initializeSocketEvents = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Register all event handlers
    registerMessageEvents(io, socket);
    registerInterestEvents(io, socket);
    registerNotificationEvents(io, socket);
    registerVisitorEvents(io, socket);
    registerStatusEvents(io, socket);
    registerAdminEvents(io, socket);

    // Handle user joining a room
    socket.on("user:join", (data) => {
      const { userId, isAdmin } = data;
      if (isAdmin) {
        socket.join(`admin:${userId}`);
        console.log(`👨‍💼 Admin ${userId} joined room`);
      } else {
        socket.join(`user:${userId}`);
        console.log(`👤 User ${userId} joined room`);
      }
    });

    // Handle the disconnect event
    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.id}`);
    });

    // Global error handler for socket
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  console.log("✅ Socket.io events initialized");
};

module.exports = initializeSocketEvents;
