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
    const user = await User.findById(req.user._id).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ================= AGE FUNCTION =================
    const calculateAge = (dob) => {
      if (!dob) return null;

      const birthDate = new Date(dob);
      const today = new Date();

      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();

      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age;
    };

    const userAge = calculateAge(user.dateOfBirth);
    if (!userAge) {
      return res.status(400).json({
        message: "User date of birth missing",
      });
    }

    const oppositeGender = user.gender === "male" ? "female" : "male";

    // ================= LOAD USER BEHAVIOR =================
    const interests = await Interest.find({
      senderId: user._id,
    }).select("receiverId");

    const interestIds = interests.map((i) => i.receiverId.toString());

    // ================= FETCH PROFILES =================
    const profiles = await User.find({
      _id: { $ne: user._id },
      gender: oppositeGender,
      isActive: true,
      role: { $ne: "admin" },
      maritalStatus: user.maritalStatus,
    })
      .select(
        "firstName lastName profilePhoto caste religion education jobLocation state dateOfBirth profileCompleted lastLogin createdAt maritalStatus rejectedBy"
      )
      .limit(100)
      .lean();

    // ================= MATCH SCORING =================
    let scoredProfiles = profiles.map((p) => {
      if (!p.dateOfBirth || !p.maritalStatus) return null;

      let score = 0;

      const candidateAge = calculateAge(p.dateOfBirth);
      if (!candidateAge) return null;

      // ================= AGE MATCH (STRICT + MUTUAL)
      if (Math.abs(candidateAge - userAge) <= 5) {
        score += 25;
      } else {
        return null;
      }

      // ================= MARITAL STATUS
      if (p.maritalStatus === user.maritalStatus) {
        score += 20;
      } else {
        return null;
      }

      // ================= RELIGION
      if (p.religion && user.religion && p.religion === user.religion) {
        score += 20;
      }

      // ================= CASTE
      if (p.caste && user.caste && p.caste === user.caste) {
        score += 10;
      }

      // ================= EDUCATION
      if (p.education && user.education && p.education === user.education) {
        score += 5;
      }

      // ================= LOCATION
      if (
        p.jobLocation &&
        user.jobLocation &&
        p.jobLocation.toLowerCase().trim() ===
        user.jobLocation.toLowerCase().trim()
      ) {
        score += 15;
      } else if (p.state && user.state && p.state === user.state) {
        score += 8;
      }

      // ================= ACTIVITY BOOST
      if (p.lastLogin) {
        const hours =
          (Date.now() - new Date(p.lastLogin)) / (1000 * 60 * 60);

        if (hours <= 24) score += 10;
        else if (hours <= 72) score += 5;
      }

      // ================= BEHAVIOR BOOST
      if (interestIds.includes(p._id.toString())) {
        score += 5;
      }

      // ================= PROFILE COMPLETION BOOST
      if (p.profileCompleted >= 80) score += 10;
      else if (p.profileCompleted >= 50) score += 5;

      // ================= NEW USER BOOST
      if (p.createdAt) {
        const days =
          (Date.now() - new Date(p.createdAt)) /
          (1000 * 60 * 60 * 24);

        if (days <= 3) score += 5;
      }

      // ================= NEGATIVE SIGNAL (OPTIONAL)
      if (p.rejectedBy?.includes(user._id)) {
        score -= 10;
      }

      return {
        ...p,
        matchScore: Math.round(score),
      };
    });

    // ================= FILTER QUALITY =================
    let filtered = scoredProfiles.filter(
      (p) => p !== null && p.matchScore >= 40
    );

    // ================= FALLBACK =================
    if (filtered.length === 0) {
      filtered = scoredProfiles.filter((p) => p !== null);
    }

    // ================= FINAL SORT (WITH SMART RANDOMNESS) =================
    filtered.sort((a, b) => {
      if (b.matchScore === a.matchScore) {
        return Math.random() - 0.5;
      }
      return b.matchScore - a.matchScore;
    });

    // ================= RESPONSE =================
    res.json(filtered.slice(0, 10));
  } catch (error) {
    console.error("Recommendation error:", error);
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

    const matches = await User.find({
      _id: { $ne: user._id },
      gender: oppositeGender,
      role: { $ne: "admin" },
      jobLocation: new RegExp(`^${user.jobLocation}$`, "i"),
    })
      .limit(6)
      .lean();

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