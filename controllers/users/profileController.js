const User = require("../../models/User");
const bcrypt = require("bcryptjs");

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile retrieved successfully",
      user,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      firstName,
      lastName,
      phone,
      about,
      gender,
      dateOfBirth,
      height,
      complexion,
      bloodGroup,
      religion,
      caste,
      maritalStatus,
      education,
      job,
      jobLocation,
      annualIncome,
      hobbies,
      profilePhoto,
    } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        phone,
        about,
        gender,
        dateOfBirth,
        height,
        complexion,
        bloodGroup,
        religion,
        caste,
        maritalStatus,
        education,
        job,
        jobLocation,
        annualIncome,
        hobbies,
        profilePhoto,
      },
      { new: true, runValidators: true },
    ).select("-password");

    res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update family info
exports.updateFamilyInfo = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      fatherName,
      fatherJob,
      motherName,
      motherJob,
      siblings,
      paternalUncleName,
      paternalUncleJob,
      maternalUncleName,
      maternalUncleJob,
      familyLocation,
      familyType,
    } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        fatherName,
        fatherJob,
        motherName,
        motherJob,
        siblings,
        paternalUncleName,
        paternalUncleJob,
        maternalUncleName,
        maternalUncleJob,
        familyLocation,
        familyType,
      },
      { new: true },
    ).select("-password");

    res.status(200).json({
      message: "Family info updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating family info:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update preferences
exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      preferredGender,
      preferredMinAge,
      preferredMaxAge,
      preferredHeight,
      preferredEducation,
      preferredReligion,
      preferredCaste,
      preferredMaritalStatus,
    } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        preferredGender,
        preferredMinAge,
        preferredMaxAge,
        preferredHeight,
        preferredEducation,
        preferredReligion,
        preferredCaste,
        preferredMaritalStatus,
      },
      { new: true },
    ).select("-password");

    res.status(200).json({
      message: "Preferences updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating preferences:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add photos
exports.addPhotos = async (req, res) => {
  try {
    const userId = req.user._id;
    const { photoUrl } = req.body;

    if (!photoUrl) {
      return res.status(400).json({ message: "Photo URL required" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $push: { photos: { url: photoUrl } },
      },
      { new: true },
    ).select("-password");

    res.status(200).json({
      message: "Photo added successfully",
      user,
    });
  } catch (error) {
    console.error("Error adding photo:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete photo
exports.deletePhoto = async (req, res) => {
  try {
    const userId = req.user._id;
    const { photoId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $pull: { photos: { _id: photoId } },
      },
      { new: true },
    ).select("-password");

    res.status(200).json({
      message: "Photo deleted successfully",
      user,
    });
  } catch (error) {
    console.error("Error deleting photo:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get notification preferences
exports.getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);

    res.status(200).json({
      message: "Notification preferences retrieved",
      preferences: user.notificationPreferences,
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update notification preferences
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { emailNotifications, smsNotifications, pushNotifications } =
      req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        notificationPreferences: {
          emailNotifications,
          smsNotifications,
          pushNotifications,
        },
      },
      { new: true },
    ).select("-password");

    res.status(200).json({
      message: "Notification preferences updated",
      preferences: user.notificationPreferences,
    });
  } catch (error) {
    console.error("Error updating preferences:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// GET USER DASHBOARD DATA
exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // ================= PROFILE VIEWS =================
    const profileViews = await User.aggregate([
      { $match: { _id: userId } },
      { $project: { visitorsCount: { $size: "$visitors" } } },
    ]);

    // ================= INTERESTS =================
    const interestsCount = await Interest.countDocuments({
      receiverId: userId,
    });

    // ================= MESSAGES =================
    const messagesCount = await Message.countDocuments({
      receiverId: userId,
    });

    // ================= SHORTLIST =================
    const user = await User.findById(userId).select(
      "shortlist profileCompleted preferredGender preferredMinAge preferredMaxAge",
    );

    const shortlistCount = user.shortlist.length;

    // ================= NEW INTERESTS =================
    const newInterests = await Interest.find({
      receiverId: userId,
      status: "pending",
    })
      .populate("senderId", "firstName lastName profilePhoto job jobLocation")
      .sort({ createdAt: -1 })
      .limit(5);

    // ================= PROFILE VISITORS =================
    const visitorIds = user.visitors?.slice(-5).map((v) => v.userId) || [];

    const visitors = await User.find({
      _id: { $in: visitorIds },
    }).select("firstName lastName profilePhoto job jobLocation");

    // ================= MATCH RECOMMENDATION =================
    const recommendedProfiles = await User.find({
      gender: user.preferredGender,
      isActive: true,
      isBanned: false,
      _id: { $ne: userId },
    })
      .select("firstName lastName profilePhoto job jobLocation dateOfBirth")
      .limit(8);

    // ================= TODAY MATCHES =================
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newMatches = await User.find({
      gender: user.preferredGender,
      createdAt: { $gte: today },
      _id: { $ne: userId },
    })
      .select("firstName lastName profilePhoto job jobLocation dateOfBirth")
      .limit(4);

    res.status(200).json({
      success: true,
      data: {
        profileViews: profileViews[0]?.visitorsCount || 0,
        interests: interestsCount,
        messages: messagesCount,
        shortlisted: shortlistCount,
        profileCompletion: user.profileCompleted,
        newMatches,
        newInterests,
        visitors,
        recommendedProfiles,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Dashboard data fetch failed",
    });
  }
};

// TRACK PROFILE VIEW
exports.trackProfileVisit = async (req, res) => {
  try {
    const visitorId = req.user._id;
    const { profileId } = req.params;

    if (visitorId.toString() === profileId) {
      return res.status(200).json({ message: "Own profile view ignored" });
    }

    const profileOwner = await User.findById(profileId);

    if (!profileOwner) {
      return res.status(404).json({ message: "User not found" });
    }

    // Add to profile owner's visitors
    await User.findByIdAndUpdate(profileId, {
      $push: {
        visitors: {
          userId: visitorId,
          visitedAt: new Date(),
        },
      },
    });

    // Add to visitor visitedProfiles
    await User.findByIdAndUpdate(visitorId, {
      $push: {
        visitedProfiles: {
          userId: profileId,
          visitedAt: new Date(),
        },
      },
    });

    res.status(200).json({
      message: "Profile visit recorded",
    });
  } catch (error) {
    console.error("Profile visit error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getVisitorsPage = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);

    // TOTAL VIEWS
    const totalViews = user.visitors.length;

    // LIKED YOU
    const likedYou = await Interest.countDocuments({
      receiverId: userId,
      status: "pending",
    });

    // SENT INTEREST
    const sentInterest = await Interest.countDocuments({
      senderId: userId,
    });

    // VISITORS LIST
    const visitorIds = user.visitors.map((v) => v.userId);

    const visitors = await User.find({
      _id: { $in: visitorIds },
    }).select("firstName lastName profilePhoto job jobLocation dateOfBirth");

    res.status(200).json({
      success: true,
      stats: {
        totalViews,
        likedYou,
        sentInterest,
      },
      visitors,
    });
  } catch (error) {
    console.error("Visitors page error:", error);
    res.status(500).json({
      message: "Failed to load visitors",
    });
  }
};


// ===============================
// 🎯 GET USER BY ID (PUBLIC PROFILE)
// ===============================
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password -otp -otpExpiry -otpAttempts -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get User Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
// controllers/profileController.js



exports.viewProfile = async (req, res) => {
  try {
    const viewerId = req.user._id;       // logged in user
    const profileId = req.params.id;     // profile being viewed

    if (viewerId.toString() === profileId) {
      return res.status(200).json({ message: "Own profile" });
    }

    // ✅ Add to viewedProfiles (viewer side)
    await User.findByIdAndUpdate(viewerId, {
      $push: {
        visitedProfiles: {
          userId: profileId,
          visitedAt: new Date(),
        },
      },
    });

    // ✅ Add to visitors (target user side)
    await User.findByIdAndUpdate(profileId, {
      $push: {
        visitors: {
          userId: viewerId,
          visitedAt: new Date(),
        },
      },
    });

    res.status(200).json({ message: "Profile viewed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error tracking view" });
  }
};

exports.getVisitors = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("visitors.userId", "firstName lastName profilePhoto jobLocation");

    res.json(user.visitors);
  } catch (err) {
    res.status(500).json({ message: "Error fetching visitors" });
  }
};
exports.getVisitorStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const totalViews = user.visitors.length;

    const likedYou = user.interests.filter(
      (i) => i.status === "received"
    ).length;

    const sentInterest = user.interests.filter(
      (i) => i.status === "sent"
    ).length;

    res.json({
      totalViews,
      likedYou,
      sentInterest,
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching stats" });
  }
};


