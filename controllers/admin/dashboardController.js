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
    // Build 30-day window (including today)
    const DAYS = 30;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (DAYS - 1));

    // Aggregations for the window
    const usersCreatedAgg = await User.aggregate([
      { $match: { role: "user", createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyActiveAgg = await User.aggregate([
      { $match: { role: "user", lastLoginAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$lastLoginAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const bannedAgg = await User.aggregate([
      { $match: { role: "user", bannedAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$bannedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const revenueAgg = await Payment.aggregate([
      {
        $match: {
          status: "success",
          createdAt: { $gte: start },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Revenue by package in the window
    const revenueByPackageAgg = await Payment.aggregate([
      {
        $match: {
          status: "success",
          createdAt: { $gte: start },
        },
      },
      {
        $group: {
          _id: "$packageName",
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Pre-counts before start for cumulative totals
    const totalBefore = await User.countDocuments({ role: "user", createdAt: { $lt: start } });
    const bannedBefore = await User.countDocuments({ role: "user", isBanned: true, bannedAt: { $lt: start } });

    // Map results for quick lookup
    const createdMap = {};
    usersCreatedAgg.forEach((r) => (createdMap[r._id] = r.count));

    const activeMap = {};
    dailyActiveAgg.forEach((r) => (activeMap[r._id] = r.count));

    const bannedMap = {};
    bannedAgg.forEach((r) => (bannedMap[r._id] = r.count));

    const revenueMap = {};
    revenueAgg.forEach((r) => (revenueMap[r._id] = r.total));

    // Build timeseries array
    const timeseries = [];
    let runningTotal = totalBefore || 0;
    let runningBanned = bannedBefore || 0;

    for (let i = 0; i < DAYS; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);

      const newUsers = createdMap[key] || 0;
      runningTotal += newUsers;

      const activeUsers = activeMap[key] || 0;
      const newBanned = bannedMap[key] || 0;
      runningBanned += newBanned;

      const revenue = revenueMap[key] || 0;

      timeseries.push({
        date: key,
        newUsers,
        totalUsers: runningTotal,
        activeUsers,
        newBanned,
        totalBanned: runningBanned,
        revenue,
      });
    }

    res.status(200).json({
      message: "Graph data retrieved successfully",
      data: {
        usersJoined: usersCreatedAgg,
        revenue: revenueAgg,
        revenueByPackage: revenueByPackageAgg.map((r) => ({ packageName: r._id, total: r.total })),
        timeseries,
      },
    });
  } catch (error) {
    console.error("Error fetching graph data:", error);
    res.status(500).json({ message: "Server error" });
  }
};
