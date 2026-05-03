const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const Message = require("../../models/Message");
const Notification = require("../../models/Notification");
const Interest = require("../../models/Interest");
const Payment = require("../../models/Payment");
const Report = require("../../models/Report");
const Ticket = require("../../models/Ticket");
const cloudinary = require("../../config/coudinary");
const Page = require("../../models/Page");

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
    if (hidePhotos !== undefined)
      user.privacySettings.hidePhotos = !!hidePhotos;
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

// ================= DELETE ACCOUNT =================
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Attempt to delete any uploaded photos from Cloudinary
    try {
      const photos = user.photos || [];
      for (const p of photos) {
        if (p && p.public_id) {
          try {
            await cloudinary.uploader.destroy(p.public_id);
          } catch (err) {
            console.warn(
              "cloudinary destroy failed for",
              p.public_id,
              err.message,
            );
          }
        }
      }
    } catch (err) {
      console.warn("Error while removing cloud images", err.message);
    }

    // Delete related documents
    await Promise.all([
      Message.deleteMany({
        $or: [{ senderId: userId }, { receiverId: userId }],
      }),
      Notification.deleteMany({ $or: [{ userId }, { relatedUserId: userId }] }),
      Interest.deleteMany({
        $or: [{ senderId: userId }, { receiverId: userId }],
      }),
      Payment.deleteMany({ userId }),
      Report.deleteMany({
        $or: [{ reportedByUserId: userId }, { reportedUserId: userId }],
      }),
      Ticket.deleteMany({ userId }),
    ]);

    // Remove references to this user from other users
    // Handle both cases where arrays store objects ({ userId }) or raw ObjectId entries
    // Simple array pulls
    await User.updateMany(
      {},
      { $pull: { likedUsers: userId, blockedUsers: userId } },
    );

    // matches: could be stored as array of objects or array of ids
    await User.updateMany(
      { "matches.userId": { $exists: true } },
      { $pull: { matches: { userId } } },
    );
    await User.updateMany({ matches: userId }, { $pull: { matches: userId } });

    // shortlist: same handling
    await User.updateMany(
      { "shortlist.userId": { $exists: true } },
      { $pull: { shortlist: { userId } } },
    );
    await User.updateMany(
      { shortlist: userId },
      { $pull: { shortlist: userId } },
    );

    // visitedProfiles and visitors: may be arrays of objects ({ userId }) or plain ids
    await User.updateMany(
      { "visitedProfiles.userId": { $exists: true } },
      { $pull: { visitedProfiles: { userId } } },
    );
    await User.updateMany(
      { visitedProfiles: userId },
      { $pull: { visitedProfiles: userId } },
    );
    await User.updateMany(
      { "visitors.userId": { $exists: true } },
      { $pull: { visitors: { userId } } },
    );
    await User.updateMany(
      { visitors: userId },
      { $pull: { visitors: userId } },
    );

    // Finally delete the user
    await User.deleteOne({ _id: userId });

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("deleteAccount error:", error);
    res.status(500).json({ message: "Failed to delete account" });
  }
};

// GET /user/pages/about
exports.getAbout = async (req, res) => {
  try {
    let page = await Page.findOne({ slug: "about" });
    if (!page) {
      // return empty content if not created yet
      return res.json({ success: true, data: { slug: "about", content: "" } });
    }
    res.json({ success: true, data: page });
  } catch (err) {
    console.error("Get about page error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
