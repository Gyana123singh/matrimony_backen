// Handle admin-related socket events
const Report = require("../models/Report");
const Ticket = require("../models/Ticket");

const registerAdminEvents = (io, socket) => {
  // Admin login
  socket.on("admin:login", async (data) => {
    try {
      const { adminId } = data;

      // Join admin room
      socket.join(`admin:${adminId}`);
      socket.join("admin:all");

      socket.emit("admin:loginConfirmed", {
        adminId,
        status: "authenticated",
        timestamp: new Date(),
      });
    } catch (error) {
      socket.emit("error", {
        type: "admin:login",
        message: error.message,
      });
    }
  });

  // Notify when new report is created
  socket.on("report:created", async (data) => {
    try {
      const { reportId, reportedUserId, reportedByUserId, reason } = data;

      const report = await Report.findById(reportId)
        .populate("reportedUser", "firstName lastName profilePhoto")
        .populate("reportedBy", "firstName lastName");

      // Broadcast to all admins
      io.to("admin:all").emit("report:new", {
        _id: report._id,
        reportedUser: report.reportedUser,
        reportedBy: report.reportedBy,
        reason: report.reason,
        description: report.description,
        createdAt: report.createdAt,
        status: report.status,
      });
    } catch (error) {
      socket.emit("error", {
        type: "report:created",
        message: error.message,
      });
    }
  });

  // Notify when new ticket is created
  socket.on("ticket:created", async (data) => {
    try {
      const { ticketId } = data;

      const ticket = await Ticket.findById(ticketId)
        .populate("user", "firstName lastName email")
        .populate("assignedTo", "firstName lastName");

      // Broadcast to all admins
      io.to("admin:all").emit("ticket:new", {
        _id: ticket._id,
        user: ticket.user,
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt,
        assignedTo: ticket.assignedTo,
      });
    } catch (error) {
      socket.emit("error", {
        type: "ticket:created",
        message: error.message,
      });
    }
  });

  // Admin resolves a report
  socket.on("report:resolve", async (data) => {
    try {
      const { reportId, action, notes } = data; // action: 'dismiss', 'warn', 'ban'

      const report = await Report.findByIdAndUpdate(reportId, {
        status: action === "dismiss" ? "dismissed" : "resolved",
        adminNotes: notes,
        resolvedAt: new Date(),
      });

      // If ban action, update user status
      if (action === "ban") {
        await User.findByIdAndUpdate(report.reportedUser, {
          isBanned: true,
          banReason: notes,
          bannedAt: new Date(),
        });
      }

      // Notify all admins
      io.to("admin:all").emit("report:resolved", {
        reportId,
        status: action === "dismiss" ? "dismissed" : "resolved",
        action,
        resolvedAt: new Date(),
      });

      socket.emit("report:resolveConfirmed", {
        reportId,
        status: "success",
      });
    } catch (error) {
      socket.emit("error", {
        type: "report:resolve",
        message: error.message,
      });
    }
  });

  // Admin assigns ticket to someone
  socket.on("ticket:assign", async (data) => {
    try {
      const { ticketId, adminId } = data;

      const ticket = await Ticket.findByIdAndUpdate(ticketId, {
        assignedTo: adminId,
        assignedAt: new Date(),
        status: "assigned",
      });

      // Notify all admins
      io.to("admin:all").emit("ticket:assigned", {
        ticketId,
        assignedTo: adminId,
        timestamp: new Date(),
      });

      socket.emit("ticket:assignConfirmed", {
        ticketId,
        assignedTo: adminId,
        status: "success",
      });
    } catch (error) {
      socket.emit("error", {
        type: "ticket:assign",
        message: error.message,
      });
    }
  });

  // Admin replies to ticket
  socket.on("ticket:reply", async (data) => {
    try {
      const { ticketId, adminId, reply } = data;

      const ticket = await Ticket.findByIdAndUpdate(
        ticketId,
        {
          $push: {
            replies: {
              sender: adminId,
              message: reply,
              sentAt: new Date(),
              isAdmin: true,
            },
          },
          status: "replied",
          updatedAt: new Date(),
        },
        { new: true },
      )
        .populate("user", "firstName lastName email")
        .populate("assignedTo", "firstName lastName");

      // Notify ticket creator and all admins
      const ticketUserId = ticket.user._id;
      io.to(`user:${ticketUserId}`).emit("ticket:replied", {
        ticketId,
        reply,
        repliedBy: adminId,
        repliedAt: new Date(),
      });

      io.to("admin:all").emit("ticket:replyNotification", {
        ticketId,
        reply,
        admin: adminId,
        timestamp: new Date(),
      });

      socket.emit("ticket:replyConfirmed", {
        ticketId,
        status: "success",
      });
    } catch (error) {
      socket.emit("error", {
        type: "ticket:reply",
        message: error.message,
      });
    }
  });

  // Admin closes ticket
  socket.on("ticket:close", async (data) => {
    try {
      const { ticketId, closureReason } = data;

      const ticket = await Ticket.findByIdAndUpdate(ticketId, {
        status: "closed",
        closureReason,
        closedAt: new Date(),
      });

      // Notify ticket creator
      io.to(`user:${ticket.user}`).emit("ticket:closed", {
        ticketId,
        reason: closureReason,
        closedAt: new Date(),
      });

      // Notify all admins
      io.to("admin:all").emit("ticket:closedNotification", {
        ticketId,
        closureReason,
        timestamp: new Date(),
      });

      socket.emit("ticket:closeConfirmed", {
        ticketId,
        status: "closed",
      });
    } catch (error) {
      socket.emit("error", {
        type: "ticket:close",
        message: error.message,
      });
    }
  });

  // Broadcast message to all admins
  socket.on("admin:broadcastMessage", async (data) => {
    try {
      const { adminId, title, message, type = "info" } = data; // type: 'info', 'warning', 'alert'

      io.to("admin:all").emit("admin:broadcastReceived", {
        from: adminId,
        title,
        message,
        type,
        timestamp: new Date(),
      });

      socket.emit("admin:broadcastSent", {
        status: "success",
      });
    } catch (error) {
      socket.emit("error", {
        type: "admin:broadcastMessage",
        message: error.message,
      });
    }
  });

  // Get live stats for admin dashboard
  socket.on("admin:getLiveStats", async (data) => {
    try {
      const { adminId } = data;

      const totalUsers = await User.countDocuments();
      const onlineUsers = await User.countDocuments({ isOnline: true });
      const pendingReports = await Report.countDocuments({ status: "pending" });
      const pendingTickets = await Ticket.countDocuments({
        status: { $in: ["pending", "assigned"] },
      });

      socket.emit("admin:liveStats", {
        totalUsers,
        onlineUsers,
        pendingReports,
        pendingTickets,
        timestamp: new Date(),
      });
    } catch (error) {
      socket.emit("error", {
        type: "admin:getLiveStats",
        message: error.message,
      });
    }
  });
};

module.exports = registerAdminEvents;
