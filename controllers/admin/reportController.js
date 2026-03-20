const Report = require("../../models/Report");
const Ticket = require("../../models/Ticket");
const User = require("../../models/User");

// Get all reports
exports.getAllReports = async (req, res) => {
  try {
    const { status = "all", page = 1, limit = 20 } = req.query;

    const query = {};
    if (status !== "all") query.status = status;

    const skip = (page - 1) * limit;

    const reports = await Report.find(query)
      .populate("reportedByUserId", "firstName lastName email")
      .populate("reportedUserId", "firstName lastName email")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Report.countDocuments(query);

    res.status(200).json({
      message: "Reports retrieved successfully",
      reports,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get report details
exports.getReportDetails = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId)
      .populate("reportedByUserId", "-password")
      .populate("reportedUserId", "-password");

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.status(200).json({
      message: "Report details retrieved successfully",
      report,
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Resolve report
exports.resolveReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { adminNotes, action } = req.body;
    const adminId = req.user._id;

    const report = await Report.findByIdAndUpdate(
      reportId,
      {
        status: "resolved",
        action,
        adminNotes,
        resolvedByAdmin: adminId,
        resolvedAt: new Date(),
      },
      { new: true },
    );

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Apply action if needed
    if (action === "ban") {
      await User.findByIdAndUpdate(report.reportedUserId, {
        isBanned: true,
        bannedAt: new Date(),
      });
    } else if (action === "suspend") {
      await User.findByIdAndUpdate(report.reportedUserId, {
        isActive: false,
      });
    } else if (action === "warning") {
      // Create notification for warning
    }

    res.status(200).json({
      message: "Report resolved successfully",
      report,
    });
  } catch (error) {
    console.error("Error resolving report:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Dismiss report
exports.dismissReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.user._id;

    const report = await Report.findByIdAndUpdate(
      reportId,
      {
        status: "dismissed",
        adminNotes,
        resolvedByAdmin: adminId,
        resolvedAt: new Date(),
      },
      { new: true },
    );

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.status(200).json({
      message: "Report dismissed successfully",
      report,
    });
  } catch (error) {
    console.error("Error dismissing report:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// =============== TICKET MANAGEMENT ===============

// Get all tickets
exports.getAllTickets = async (req, res) => {
  try {
    const { status = "all", category, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status !== "all") query.status = status;
    if (category) query.category = category;

    const skip = (page - 1) * limit;

    const tickets = await Ticket.find(query)
      .populate("userId", "firstName lastName email")
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
    const { ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId)
      .populate("userId", "-password")
      .populate("assignedToAdmin", "firstName lastName email");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.status(200).json({
      message: "Ticket details retrieved successfully",
      ticket,
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Assign ticket to admin
exports.assignTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const adminId = req.user._id;

    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        status: "assigned",
        assignedToAdmin: adminId,
      },
      { new: true },
    );

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.status(200).json({
      message: "Ticket assigned successfully",
      ticket,
    });
  } catch (error) {
    console.error("Error assigning ticket:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add admin reply to ticket
exports.addReply = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const adminId = req.user._id;
    const { message, attachments } = req.body;

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    ticket.replies.push({
      senderType: "admin",
      senderId: adminId,
      message,
      attachments: attachments || [],
    });

    ticket.status = "answered";
    await ticket.save();

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
    const { ticketId } = req.params;

    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        status: "closed",
        closedAt: new Date(),
      },
      { new: true },
    );

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
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

// Get ticket stats
exports.getTicketStats = async (req, res) => {
  try {
    const totalTickets = await Ticket.countDocuments();
    const pendingTickets = await Ticket.countDocuments({
      status: { $in: ["pending", "assigned"] },
    });
    const answeredTickets = await Ticket.countDocuments({ status: "answered" });
    const closedTickets = await Ticket.countDocuments({ status: "closed" });

    const avgResolutionTime = await Ticket.aggregate([
      { $match: { status: "closed" } },
      {
        $group: {
          _id: null,
          avgTime: {
            $avg: {
              $subtract: ["$closedAt", "$createdAt"],
            },
          },
        },
      },
    ]);

    res.status(200).json({
      message: "Ticket stats retrieved successfully",
      stats: {
        total: totalTickets,
        pending: pendingTickets,
        answered: answeredTickets,
        closed: closedTickets,
        avgResolutionTimeMs: avgResolutionTime[0]?.avgTime || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching ticket stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};
