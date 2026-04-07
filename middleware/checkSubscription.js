const User = require("../models/User");

/**
 * Middleware: checkSubscription
 * - Ensures user has an active, non-expired subscription.
 * - If subscriptionEndDate has passed, marks subscription as expired.
 */
const checkSubscription = async (req, res, next) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Auto-expire if end date passed
    if (
      user.subscriptionStatus === "active" &&
      user.subscriptionEndDate &&
      new Date() > user.subscriptionEndDate
    ) {
      user.subscriptionStatus = "expired";
      await user.save();
      return res.status(403).json({ message: "Subscription expired" });
    }

    if (user.subscriptionStatus !== "active") {
      return res.status(403).json({ message: "Upgrade required" });
    }

    // At this point subscriptionStatus === 'active' and subscriptionEndDate is in future
    next();
  } catch (err) {
    console.error("checkSubscription error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = checkSubscription;