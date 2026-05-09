const User = require("../../models/User");
const Interest = require("../../models/Interest");
const Message = require("../../models/Message");

// ================= HELPERS =================
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


// ================= DASHBOARD STATS =================

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      _id: user._id,
      name: user.fullName,
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
    if (!user) return res.status(404).json({ message: "User not found" });

    const userAge = calculateAge(user.dateOfBirth);
    const oppositeGender = user.gender === "male" ? "female" : "male";

    // Prefs
    const prefMin = user.preferredMinAge ? Number(user.preferredMinAge) : null;
    const prefMax = user.preferredMaxAge ? Number(user.preferredMaxAge) : null;
    const prefMarital = user.preferredMaritalStatus;
    const prefReligion = user.preferredReligion;
    const prefCaste = user.preferredCaste;

    // Base query
    const query = {
      _id: { $ne: user._id },
      gender: oppositeGender,
      isActive: true,
      role: { $ne: "admin" }
    };

    // Strict Age Filter at DB level if possible, but calculateAge is complex
    // We'll filter in memory for now as the dataset is small, 
    // but we can optimize the query with date ranges later.

    const profiles = await User.find(query)
      .select("fullName profilePhoto caste religion jobLocation state dateOfBirth profileCompleted lastLogin createdAt maritalStatus")
      .limit(200)
      .lean();

    const scored = profiles.map(p => {
      let score = 0;
      const age = calculateAge(p.dateOfBirth);

      // --- STRICT AGE FILTER ---
      if (prefMin || prefMax) {
        if (!age) return null;
        if (prefMin && age < prefMin) return null;
        if (prefMax && age > prefMax) return null;
      } else if (userAge && age) {
        // Fallback to reasonable range if no pref set
        if (age < userAge - 5 || age > userAge + 5) return null;
      }

      // --- STRICT MARITAL STATUS ---
      if (prefMarital && prefMarital !== "Any") {
        if (!p.maritalStatus || p.maritalStatus.toLowerCase() !== prefMarital.toLowerCase()) return null;
      }

      // --- STRICT RELIGION ---
      if (prefReligion && prefReligion !== "Any") {
        if (p.religion !== prefReligion) return null;
      }

      // --- SCORING ---
      if (age) score += 20;
      if (p.religion === user.religion) score += 10;
      if (p.caste === user.caste) score += 10;
      if (p.jobLocation === user.jobLocation) score += 10;
      if (p.profileCompleted >= 70) score += 10;

      return { ...p, age: age || "N/A", matchScore: score };
    }).filter(Boolean);

    scored.sort((a, b) => b.matchScore - a.matchScore);
    res.json(scored.slice(0, 20));
  } catch (error) {
    console.error("Recommended error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= NEW MATCHES =================
exports.getNewMatches = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const oppositeGender = user.gender === "male" ? "female" : "male";

    // Prefs
    const prefMin = user.preferredMinAge ? Number(user.preferredMinAge) : null;
    const prefMax = user.preferredMaxAge ? Number(user.preferredMaxAge) : null;

    // Filter for profiles joined in the last 15 days
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const query = {
      _id: { $ne: user._id },
      gender: oppositeGender,
      isActive: true,
      role: { $ne: "admin" },
      createdAt: { $gte: fifteenDaysAgo }
    };

    const matches = await User.find(query).sort({ createdAt: -1 }).limit(50).lean();

    const filtered = matches.map(m => {
      const age = calculateAge(m.dateOfBirth);
      // STRICT AGE FILTER
      if (prefMin && age < prefMin) return null;
      if (prefMax && age > prefMax) return null;
      return { ...m, age: age || "N/A" };
    }).filter(Boolean);

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: "New matches error" });
  }
};

// ================= NEAR MATCHES =================
exports.getNearMatches = async (req, res) => {
  // Near Me is being removed from UI, but keeping controller logic safe
  res.json([]);
};

// ================= ACTIVE USERS =================
exports.getActiveUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const oppositeGender = user.gender === "male" ? "female" : "male";
    const prefMin = user.preferredMinAge ? Number(user.preferredMinAge) : null;
    const prefMax = user.preferredMaxAge ? Number(user.preferredMaxAge) : null;

    const query = {
      _id: { $ne: user._id },
      gender: oppositeGender,
      isActive: true,
      isOnline: true,
    };

    const matches = await User.find(query).limit(50).lean();

    const filtered = matches.map(m => {
      const age = calculateAge(m.dateOfBirth);
      if (prefMin && age < prefMin) return null;
      if (prefMax && age > prefMax) return null;
      return { ...m, age: age || "N/A" };
    }).filter(Boolean);

    res.json(filtered);
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
      .populate("senderId", "fullName profilePhoto dateOfBirth")
      .limit(3)
      .sort({ createdAt: -1 });

    const formatted = interests.map((i) => ({
      ...i.toObject(),
      senderId: {
        ...i.senderId.toObject(),
        age: calculateAge(i.senderId.dateOfBirth),
      },
    }));

    res.json(formatted);
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
    }).select("fullName profilePhoto job");

    // 🔥 ADD THIS PART (IMPORTANT)
    const formatted = visitors.map((v) => ({
      ...v.toObject(),
      age: calculateAge(v.dateOfBirth),
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