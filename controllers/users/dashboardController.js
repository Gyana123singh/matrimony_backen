const User = require("../../models/User");
const Interest = require("../../models/Interest");
const Message = require("../../models/Message");

// ================= DASHBOARD STATS =================

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,

      // ✅ ONLY PATH
      avatar: user.profilePhoto,
    });
  } catch (error) {
    res.status(500).json({ message: "Profile fetch error" });
  }
};
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    res.json({
      profileViews: user.visitors?.length || 0,
      interests: await Interest.countDocuments({ receiverId: userId }),
      messages: await Message.countDocuments({
        receiverId: userId,
        isRead: false,
      }),
      shortlisted: user.shortlist?.length || 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Dashboard stats error" });
  }
};

// ================= RECOMMENDED =================
exports.getRecommendedProfiles = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // ✅ opposite gender logic
    const oppositeGender = user.gender === "male" ? "female" : "male";

    const profiles = await User.find({
      _id: { $ne: user._id },
      gender: oppositeGender,
      isActive: true,
      role: { $ne: "admin" },
    });

    // ✅ scoring system
    const scoredProfiles = profiles.map((p) => {
      let score = 0;

      if (p.religion === user.religion) score += 30;
      if (p.caste === user.caste) score += 20;
      if (p.jobLocation === user.jobLocation) score += 25;
      if (p.education === user.education) score += 15;

      // fallback (avoid empty feel)
      if (score === 0) score = 5;

      return { ...p.toObject(), matchScore: score };
    });

    scoredProfiles.sort((a, b) => b.matchScore - a.matchScore);

    res.json(scoredProfiles.slice(0, 6));
  } catch (error) {
    res.status(500).json({ message: "Recommendation error" });
  }
};

// ================= NEW MATCHES =================
exports.getNewMatches = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const oppositeGender = user.gender === "male" ? "female" : "male";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const matches = await User.find({
      _id: { $ne: user._id },
      gender: oppositeGender,
      createdAt: { $gte: today },
      role: { $ne: "admin" },
    });

    res.json(matches.slice(0, 6));
  } catch (error) {
    res.status(500).json({ message: "New matches error" });
  }
};

// ================= NEAR MATCHES =================
exports.getNearMatches = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const oppositeGender = user.gender === "male" ? "female" : "male";

    // ⚠️ NOT strict location (important)
    const matches = await User.find({
      _id: { $ne: user._id },
      gender: oppositeGender,
      role: { $ne: "admin" },
    }).limit(6);

    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: "Near match error" });
  }
};

// ================= ACTIVE USERS =================
exports.getActiveUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const oppositeGender = user.gender === "male" ? "female" : "male";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const users = await User.find({
      gender: oppositeGender,
      lastLogin: { $gte: today },
      isActive: true,
      role: { $ne: "admin" },
    }).limit(6);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Active users error" });
  }
};

// ================= NEW INTERESTS =================
exports.getNewInterests = async (req, res) => {
  try {
    const interests = await Interest.find({
      receiverId: req.user._id,
      status: "pending",
    })
      .populate("senderId", "firstName lastName profilePhoto dateOfBirth")
      .limit(3)
      .sort({ createdAt: -1 });

    res.json(interests);
  } catch (error) {
    res.status(500).json({ message: "Interest fetch error" });
  }
};

// ================= VISITORS =================
exports.getVisitors = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const visitorIds = user.visitors.map((v) => v.userId);

    const visitors = await User.find({
      _id: { $in: visitorIds },
      role: { $ne: "admin" },
    }).select("firstName lastName profilePhoto job");

    // 🔥 ADD THIS PART (IMPORTANT)
    const formatted = visitors.map((v) => ({
      ...v.toObject(),
      isLiked: user.likedUsers?.some(
        (id) => id.toString() === v._id.toString()
      ),
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Visitors fetch error" });
  }
};

// ================= TRACK VISIT =================
exports.trackVisit = async (req, res) => {
  try {
    const visitorId = req.user._id;
    const { profileId } = req.params;

    if (visitorId.toString() === profileId) {
      return res.json({ message: "Self visit ignored" });
    }

    await User.findByIdAndUpdate(profileId, {
      $push: {
        visitors: {
          userId: visitorId,
          visitedAt: new Date(),
        },
      },
    });

    res.json({ message: "Visit tracked" });
  } catch (error) {
    res.status(500).json({ message: "Visit tracking error" });
  }
};

// ================= LIKE PROFILE =================
exports.toggleLike = async (req, res) => {
  try {
    const userId = req.user._id;
    const { profileId } = req.params;

    if (!profileId) {
      return res.status(400).json({ message: "Profile ID required" });
    }

    const user = await User.findById(userId);

    const alreadyLiked = user.likedUsers?.includes(profileId);

    if (alreadyLiked) {
      // ❌ REMOVE LIKE
      user.likedUsers = user.likedUsers.filter(
        (id) => id.toString() !== profileId
      );
    } else {
      // ✅ ADD LIKE
      user.likedUsers.push(profileId);
    }

    await user.save();

    res.json({
      message: alreadyLiked ? "Like removed" : "Profile liked",
      liked: !alreadyLiked,
    });
  } catch (error) {
    res.status(500).json({ message: "Like error" });
  }
};