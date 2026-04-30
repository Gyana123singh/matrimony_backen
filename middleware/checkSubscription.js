const User = require("../models/User");

const checkSubscription = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ❗ check if no subscription at all
    if (!user.subscriptionStatus || user.subscriptionStatus === "inactive") {
      return res.status(403).json({ message: "Upgrade required" });
    }

    // 🔥 expiry check
    if (
      user.subscriptionStatus === "active" &&
      user.subscriptionEndDate &&
      new Date() > user.subscriptionEndDate
    ) {
      user.subscriptionStatus = "expired";
      await user.save();

      return res.status(403).json({ message: "Subscription expired" });
    }

    // ❗ final check
    if (user.subscriptionStatus !== "active") {
      return res.status(403).json({ message: "Upgrade required" });
    }

    next();
  } catch (err) {
    console.error("checkSubscription error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = checkSubscription;
