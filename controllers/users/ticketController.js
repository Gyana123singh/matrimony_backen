const Ticket = require("../../models/Ticket");
const User = require("../../models/User");

// Create new ticket (user)
exports.createTicket = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { subject, details, priority } = req.body;

    if (!subject || !details) {
      return res.status(400).json({ message: "Subject and details are required" });
    }

    const ticket = await Ticket.create({
      userId,
      subject,
      details,
      priority: priority || "Medium",
      status: "pending",
    });

    return res.status(201).json({ message: "Ticket created", ticket });
  } catch (error) {
    console.error("createTicket error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get tickets for logged-in user
exports.getUserTickets = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const tickets = await Ticket.find({ userId }).sort({ createdAt: -1 });
    return res.json({ tickets });
  } catch (error) {
    console.error("getUserTickets error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get ticket details
exports.getTicketDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id)
      .populate("userId", "firstName lastName email")
      .populate("assignedTo", "firstName lastName email");

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    return res.json({ ticket });
  } catch (error) {
    console.error("getTicketDetails error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Reply to ticket (user or admin)
exports.replyTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) return res.status(400).json({ message: "Message is required" });

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const isAdmin = req.user && req.user.role === "admin";
    const senderType = isAdmin ? "admin" : "user";
    const senderName = req.user?.firstName
      ? `${req.user.firstName} ${req.user.lastName || ""}`.trim()
      : (req.user?.name || "Admin");

    ticket.replies.push({ senderType, senderName, message });

    // If admin replied, mark answered
    if (senderType === "admin") ticket.status = "answered";

    ticket.updatedAt = Date.now();
    await ticket.save();

    const populated = await Ticket.findById(id)
      .populate("userId", "firstName lastName email")
      .populate("assignedTo", "firstName lastName email");

    // Server-side debug log
    try {
      console.log("[ticketController.replyTicket] reply added:", {
        ticketId: id,
        senderType,
        senderName,
        message,
        repliesCount: populated.replies ? populated.replies.length : 0,
      });
    } catch (e) {
      console.warn("Could not log reply details", e);
    }

    // Emit socket events so clients get realtime updates
    try {
      const io = req.app.get("io");
      if (io && populated && populated.userId) {
        const userIdVal = populated.userId._id || populated.userId;
        const userRoom = `user:${userIdVal}`;
        console.log(`[ticketController.replyTicket] emitting to room: ${userRoom}`);
        const payload = { ticket: populated, reply: { senderType, senderName, message } };
        io.to(userRoom).emit("ticket:replied", payload);

        // notify admins as well
        io.to("admin:all").emit("ticket:replyNotification", payload);
        console.log("[ticketController.replyTicket] emitted ticket:replied and ticket:replyNotification");
      } else {
        console.warn("[ticketController.replyTicket] io or populated.userId missing, cannot emit");
      }
    } catch (e) {
      console.warn("Failed to emit ticket reply socket events:", e);
    }

    return res.json({ message: "Reply added", ticket: populated });
  } catch (error) {
    console.error("replyTicket error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Assign ticket to admin
exports.assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    // if admin wants to assign to another admin, accept adminId in body
    const assignTo = req.body.adminId || req.user?._id || req.user?.id;

    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { assignedTo: assignTo },
      { new: true }
    )
      .populate("userId", "firstName lastName email")
      .populate("assignedTo", "firstName lastName email");

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    return res.json({ message: "Ticket assigned", ticket });
  } catch (error) {
    console.error("assignTicket error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Close ticket
exports.closeTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Only owner or admin can close
    const isAdmin = req.user && req.user.role === "admin";
    const userId = req.user?._id || req.user?.id;
    if (!isAdmin && ticket.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to close this ticket" });
    }

    ticket.status = "closed";
    await ticket.save();

    const populated = await Ticket.findById(id)
      .populate("userId", "firstName lastName email")
      .populate("assignedTo", "firstName lastName email");

    return res.json({ message: "Ticket closed", ticket: populated });
  } catch (error) {
    console.error("closeTicket error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: get all tickets (with pagination + filter)
exports.getAllTickets = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, q } = req.query;
    const filter = {};
    if (status) filter.status = status;

    // Build search
    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [{ subject: regex }];
      // We will search user name via aggregation/lookup by populating then filtering client-side if needed.
    }

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const total = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("userId", "firstName lastName email")
      .populate("assignedTo", "firstName lastName email");

    return res.json({ tickets, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error("getAllTickets error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin ticket stats (optional)
exports.getTicketStats = async (req, res) => {
  try {
    const pending = await Ticket.countDocuments({ status: "pending" });
    const answered = await Ticket.countDocuments({ status: "answered" });
    const closed = await Ticket.countDocuments({ status: "closed" });

    return res.json({ pending, answered, closed });
  } catch (error) {
    console.error("getTicketStats error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
