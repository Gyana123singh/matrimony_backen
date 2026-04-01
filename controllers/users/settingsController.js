const User = require("../../models/User");
const bcrypt = require("bcryptjs");

// ================= GET SETTINGS =================
exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure consistent shape for frontend
    const privacy = user.privacySettings || {};
    const notify = user.notificationSettings || {};

    res.json({
      email: user.email,
      phone: user.phone || "",
      privacySettings: {
        hidePhone: !!privacy.hidePhone,
        hidePhotos: !!privacy.hidePhotos,
        profileVisibility: privacy.profileVisibility || "public",
      },
      notificationSettings: {
        emailNotifications: notify.emailNotifications ?? true,
        smsNotifications: notify.smsNotifications ?? true,
        interestAlerts: notify.interestAlerts ?? true,
        messageAlerts: notify.messageAlerts ?? true,
        profileViewAlerts: notify.profileViewAlerts ?? true,
      },
    });
  } catch (error) {
    console.error("getSettings error:", error);
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
    // Basic validation / coercion
    // Fetch current user and merge only provided fields to avoid overwriting
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (phone !== undefined) {
      user.phone = phone;
    }

    // privacy
    user.privacySettings = user.privacySettings || {};
    if (hidePhone !== undefined) user.privacySettings.hidePhone = !!hidePhone;
    if (hidePhotos !== undefined) user.privacySettings.hidePhotos = !!hidePhotos;
    if (profileVisibility !== undefined)
      user.privacySettings.profileVisibility = profileVisibility;

    // notifications
    user.notificationSettings = user.notificationSettings || {};
    if (emailNotifications !== undefined)
      user.notificationSettings.emailNotifications = !!emailNotifications;
    if (smsNotifications !== undefined)
      user.notificationSettings.smsNotifications = !!smsNotifications;
    if (interestAlerts !== undefined)
      user.notificationSettings.interestAlerts = !!interestAlerts;
    if (messageAlerts !== undefined)
      user.notificationSettings.messageAlerts = !!messageAlerts;
    if (profileViewAlerts !== undefined)
      user.notificationSettings.profileViewAlerts = !!profileViewAlerts;

    await user.save();

    res.json({
      message: "Settings updated successfully",
      data: {
        email: user.email,
        phone: user.phone || "",
        privacySettings: user.privacySettings,
        notificationSettings: user.notificationSettings,
      },
    });
  } catch (error) {
    console.error("updateAllSettings error:", error);
    res.status(500).json({ message: "Update failed" });
  }
};

// ================= CHANGE PASSWORD =================
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Missing password fields" });
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated" });
  } catch (error) {
    console.error("changePassword error:", error);
    res.status(500).json({ message: "Password update failed" });
  }
};
