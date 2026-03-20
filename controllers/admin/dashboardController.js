const User = require("../../models/User");
const Payment = require("../../models/Payment");
const Interest = require("../../models/Interest");
const Ticket = require("../../models/Ticket");
const Report = require("../../models/Report");

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const activeUsers = await User.countDocuments({
      role: "user",
      isActive: true,
    });
    const bannedUsers = await User.countDocuments({
      role: "user",
      isBanned: true,
    });
    const emailVerifiedUsers = await User.countDocuments({
      role: "user",
      isEmailVerified: true,
    });
    const phoneVerifiedUsers = await User.countDocuments({
      role: "user",
      isPhoneVerified: true,
    });
    const kycVerifiedUsers = await User.countDocuments({
      role: "user",
      isKycVerified: true,
    });

    const totalRevenue = await Payment.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const pendingTickets = await Ticket.countDocuments({
      status: { $in: ["pending", "assigned"] },
    });
    const resolvedTickets = await Ticket.countDocuments({
      status: "closed",
    });

    const pendingReports = await Report.countDocuments({
      status: "pending",
    });

    const subscriptionStats = await User.aggregate([
      { $match: { role: "user" } },
      {
        $group: {
          _id: "$subscriptionStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      message: "Dashboard stats retrieved successfully",
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          banned: bannedUsers,
          emailVerified: emailVerifiedUsers,
          phoneVerified: phoneVerifiedUsers,
          kycVerified: kycVerifiedUsers,
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
        },
        support: {
          pendingTickets,
          resolvedTickets,
        },
        reports: {
          pending: pendingReports,
        },
        subscriptions: subscriptionStats,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get dashboard graphs data
exports.getGraphData = async (req, res) => {
  try {
    // Users joined over time (last 30 days)
    const usersJoinedData = await User.aggregate([
      {
        $match: {
          role: "user",
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Revenue over time (last 30 days)
    const revenueData = await Payment.aggregate([
      {
        $match: {
          status: "success",
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      message: "Graph data retrieved successfully",
      data: {
        usersJoined: usersJoinedData,
        revenue: revenueData,
      },
    });
  } catch (error) {
    console.error("Error fetching graph data:", error);
    res.status(500).json({ message: "Server error" });
  }
};
