const User = require("../models/User");

exports.updateLastSeen = async (req, res, next) => {
  try {
    if (req.user?._id) {
      await User.findByIdAndUpdate(req.user._id, {
        lastSeen: new Date(),
        isOnline: true,
      });
    }
    next();
  } catch (err) {
    next();
  }
};