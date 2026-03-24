const Ticket = require("../../models/Ticket");

// Create ticket
exports.createTicket = async (req, res) => {
  try {
    const userId = req.user._id;
    const { subject, description, category } = req.body;

    const ticket = new Ticket({
      userId,
      subject,
      description,
      category,
      status: "pending",
    });

    await ticket.save();

    // Emit real-time notification to admins
    try {
      const io = req.app.get("io");
      if (io) {
        const populated = await Ticket.findById(ticket._id).populate(
          "userId",
          "firstName lastName email",
        );

        io.to("admin:all").emit("ticket:new", {
          _id: populated._id,
          user: populated.userId,
          subject: populated.subject,
          description: populated.description,
          category: populated.category,
          priority: populated.priority,
          status: populated.status,
          createdAt: populated.createdAt,
        });
      }
    } catch (err) {
      console.error("Error emitting ticket event:", err);
    }

    res.status(201).json({
      message: "Support ticket created successfully",
      ticket,
    });
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user tickets
exports.getTickets = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { userId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const tickets = await Ticket.find(query)
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Ticket.countDocuments(query);

    res.status(200).json({
      message: "Tickets retrieved successfully",
      tickets,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get ticket details
exports.getTicketDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const { ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticket.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.status(200).json({
      message: "Ticket details retrieved successfully",
      ticket,
    });
  } catch (error) {
    console.error("Error fetching ticket details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add reply to ticket
exports.addReply = async (req, res) => {
  try {
    const userId = req.user._id;
    const { ticketId } = req.params;
    const { message, attachments } = req.body;

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticket.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    ticket.replies.push({
      senderType: "user",
      senderId: userId,
      message,
      attachments: attachments || [],
    });

    await ticket.save();

    // Emit user reply event to admins
    try {
      const io = req.app.get("io");
      if (io) {
        const populated = await Ticket.findById(ticket._id).populate(
          "userId",
          "firstName lastName email",
        );

        io.to("admin:all").emit("ticket:userReply", {
          ticketId: ticket._id,
          user: populated.userId,
          message,
          sentAt: new Date(),
        });
      }
    } catch (err) {
      console.error("Error emitting ticket reply event:", err);
    }

    res.status(200).json({
      message: "Reply added successfully",
      ticket,
    });
  } catch (error) {
    console.error("Error adding reply:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Close ticket
exports.closeTicket = async (req, res) => {
  try {
    const userId = req.user._id;
    const { ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticket.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    ticket.status = "closed";
    ticket.closedAt = new Date();
    await ticket.save();

    // Emit closed event to admins
    try {
      const io = req.app.get("io");
      if (io) {
        io.to("admin:all").emit("ticket:closedNotification", {
          ticketId: ticket._id,
          closedAt: ticket.closedAt,
        });
      }
    } catch (err) {
      console.error("Error emitting ticket closed event:", err);
    }

    res.status(200).json({
      message: "Ticket closed successfully",
      ticket,
    });
  } catch (error) {
    console.error("Error closing ticket:", error);
    res.status(500).json({ message: "Server error" });
  }
};
