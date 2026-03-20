const User = require("../../models/User");
const bcrypt = require("bcryptjs");

// ================= GET SETTINGS =================
exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      email: user.email,
      phone: user.phone || "",
      privacySettings: user.privacySettings || {},
      notificationSettings: user.notificationSettings || {},
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
};

// ================= SAVE ALL SETTINGS =================
exports.updateAllSettings = async (req, res) => {
  try {
    const {
      phone,
      hidePhone,
      hidePhotos,
      profileVisibility,
      emailNotifications,
      smsNotifications,
      interestAlerts,
      messageAlerts,
      profileViewAlerts,
    } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        phone,
        privacySettings: {
          hidePhone,
          hidePhotos,
          profileVisibility,
        },
        notificationSettings: {
          emailNotifications,
          smsNotifications,
          interestAlerts,
          messageAlerts,
          profileViewAlerts,
        },
      },
      { new: true },
    );

    res.json({
      message: "Settings updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};

// ================= CHANGE PASSWORD =================
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated" });
  } catch (error) {
    res.status(500).json({ message: "Password update failed" });
  }
};
