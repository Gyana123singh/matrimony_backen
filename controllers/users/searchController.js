const User = require("../../models/User");

// Search profiles
exports.searchProfiles = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      gender,
      minAge,
      maxAge,
      religion,
      caste,
      education,
      location,
      profession,
      maritalStatus,
      smoking,
      drinking,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {
      _id: { $ne: userId },
      isActive: true,
      isBanned: false,
    };

    if (gender) query.gender = gender;
    if (religion) query.religion = religion;
    if (caste) query.caste = caste;
    if (education) query.education = education;

    // Support flexible location matching:
    // - if `location` is provided as a comma separated string (e.g. "State, City"), split and match any part
    // - also consider explicit `state` and `city` query params when present
    if (location || req.query.state || req.query.city) {
      const parts = [];
      // Prioritize explicit city first
      if (req.query.city) parts.push(req.query.city.trim());
      // Then explicit state
      if (req.query.state) parts.push(req.query.state.trim());
      // Then any parts from the generic `location` string, but push city-like parts first when possible
      if (location) {
        const split = location.split(",").map((s) => s.trim()).filter(Boolean);
        // if split has 2 parts and looks like [state, city] (common in frontend), push city then state
        if (split.length === 2) {
          // try to detect which looks like a city by checking length or presence of spaces (heuristic)
          const [a, b] = split;
          // prefer the shorter token or the one containing spaces (more likely city name); but keep both
          parts.push(b);
          parts.push(a);
        } else {
          parts.push(...split);
        }
      }

      // Build unique ordered parts preserving priority (city first)
      const uniqueParts = [];
      for (const p of parts) {
        if (p && !uniqueParts.includes(p)) uniqueParts.push(p);
      }

      const ors = uniqueParts.flatMap((p) => {
        const r = new RegExp(p.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"), "i");
        return [
          { city: r },
          { jobCity: r },
          { presentAddress: r },
          { jobLocation: r },
          { state: r },
          { jobState: r },
        ];
      });

      if (ors.length) query.$or = ors;
    }
    if (profession) query.job = new RegExp(profession, "i");
    if (maritalStatus) query.maritalStatus = maritalStatus;
    if (smoking) query.smoking = smoking;
    if (drinking) query.drinking = drinking;

    // Age filter
    if (minAge || maxAge) {
      const now = new Date();
      if (minAge) {
        const maxDate = new Date(
          now.getFullYear() - minAge,
          now.getMonth(),
          now.getDate(),
        );
        query.dateOfBirth = { $lte: maxDate };
      }
      if (maxAge) {
        const minDate = new Date(
          now.getFullYear() - maxAge,
          now.getMonth(),
          now.getDate(),
        );
        if (query.dateOfBirth) {
          query.dateOfBirth.$gte = minDate;
        } else {
          query.dateOfBirth = { $gte: minDate };
        }
      }
    }

    const skip = (page - 1) * limit;

    let profiles = await User.find(query)
      .select("-password")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    // Apply photo privacy rules per profile based on viewer subscription / ownership
    const viewer = await User.findById(userId).select("subscriptionStatus subscriptionEndDate");
    const viewerHasActive =
      viewer && viewer.subscriptionStatus === "active" && (!viewer.subscriptionEndDate || new Date() < viewer.subscriptionEndDate);

    profiles = profiles.map((p) => {
      const obj = p.toObject();

      const hidePhotos = obj.privacySettings?.hidePhotos;

      // Owner can always see their own photos
      if (obj._id.toString() === userId.toString()) return obj;

      if (hidePhotos) {
        if (!viewerHasActive) {
          obj.profilePhoto = "/default-avatar.png";
          obj.photos = [];
        }
      }

      return obj;
    });

    res.status(200).json({
      message: "Profiles fetched successfully",
      profiles,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error searching profiles:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Public search (no authentication required)
exports.publicSearchProfiles = async (req, res) => {
  try {
    const {
      gender,
      minAge,
      maxAge,
      religion,
      caste,
      education,
      location,
      profession,
      maritalStatus,
      smoking,
      drinking,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {
      isActive: true,
      isBanned: false,
    };

    if (gender) query.gender = gender;
    if (religion) query.religion = religion;
    if (caste) query.caste = caste;
    if (education) query.education = education;

    // Support flexible location matching for public search as well
    if (location || req.query.state || req.query.city) {
      const parts = [];
      if (req.query.city) parts.push(req.query.city.trim());
      if (req.query.state) parts.push(req.query.state.trim());
      if (location) {
        const split = location.split(",").map((s) => s.trim()).filter(Boolean);
        if (split.length === 2) {
          parts.push(split[1]);
          parts.push(split[0]);
        } else {
          parts.push(...split);
        }
      }

      const uniqueParts = [];
      for (const p of parts) {
        if (p && !uniqueParts.includes(p)) uniqueParts.push(p);
      }

      const ors = uniqueParts.flatMap((p) => {
        const r = new RegExp(p.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"), "i");
        return [
          { city: r },
          { jobCity: r },
          { presentAddress: r },
          { jobLocation: r },
          { state: r },
          { jobState: r },
        ];
      });

      if (ors.length) query.$or = ors;
    }
    if (profession) query.job = new RegExp(profession, "i");
    if (maritalStatus) query.maritalStatus = maritalStatus;
    if (smoking) query.smoking = smoking;
    if (drinking) query.drinking = drinking;

    // Age filter
    if (minAge || maxAge) {
      const now = new Date();
      if (minAge) {
        const maxDate = new Date(
          now.getFullYear() - minAge,
          now.getMonth(),
          now.getDate(),
        );
        query.dateOfBirth = { $lte: maxDate };
      }
      if (maxAge) {
        const minDate = new Date(
          now.getFullYear() - maxAge,
          now.getMonth(),
          now.getDate(),
        );
        if (query.dateOfBirth) {
          query.dateOfBirth.$gte = minDate;
        } else {
          query.dateOfBirth = { $gte: minDate };
        }
      }
    }

    const skip = (page - 1) * limit;

    let profiles = await User.find(query)
      .select("-password")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    // Public viewers should not see photos when target profile has hidePhotos enabled
    profiles = profiles.map((p) => {
      const obj = p.toObject();
      const hidePhotos = obj.privacySettings?.hidePhotos;

      if (hidePhotos) {
        obj.profilePhoto = "/default-avatar.png";
        obj.photos = [];
      }

      return obj;
    });

    res.status(200).json({
      message: "Profiles fetched successfully",
      profiles,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error searching profiles (public):", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get recommended matches
exports.getMatches = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const query = {
      _id: { $ne: userId },
      isActive: true,
      isBanned: false,
    };

    // Apply user preferences
    if (user.preferredGender) query.gender = user.preferredGender;
    if (user.preferredReligion) query.religion = user.preferredReligion;
    if (user.preferredCaste) query.caste = user.preferredCaste;

    const skip = (page - 1) * limit;

    let matches = await User.find(query)
      .select("-password")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    // apply photo privacy similar to search
    const viewer = user; // already fetched above
    const viewerHasActive =
      viewer && viewer.subscriptionStatus === "active" && (!viewer.subscriptionEndDate || new Date() < viewer.subscriptionEndDate);

    matches = matches.map((p) => {
      const obj = p.toObject();
      const hidePhotos = obj.privacySettings?.hidePhotos;

      if (obj._id.toString() === userId.toString()) return obj;

      if (hidePhotos && !viewerHasActive) {
        obj.profilePhoto = "/default-avatar.png";
        obj.photos = [];
      }

      return obj;
    });

    res.status(200).json({
      message: "Matches fetched successfully",
      matches,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// View profile
exports.viewProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { profileId } = req.params;

    const profile = await User.findById(profileId).select("-password");

    if (!profile || !profile.isActive || profile.isBanned) {
      return res.status(404).json({ message: "Profile not found" });
    }
    // Determine viewer subscription state but do not force subscription to view basic profile
    const viewer = await User.findById(userId).select(
      "subscriptionStatus subscriptionEndDate remainingViews"
    );

    const viewerHasActive =
      viewer &&
      viewer.subscriptionStatus === "active" &&
      (!viewer.subscriptionEndDate || new Date() < viewer.subscriptionEndDate);

    // Mask contact details for non-premium viewers
    const profileObj = profile.toObject();
    if (profileObj._id.toString() !== userId.toString() && !viewerHasActive) {
      profileObj.phone = null;
      profileObj.email = null;
    }

    // Add to visitors if not already present
    const isAlreadyVisited = profile.visitors.some(
      (v) => v.userId.toString() === userId.toString(),
    );

    if (!isAlreadyVisited) {
      profile.visitors.push({
        userId,
        visitedAt: new Date(),
      });
      await profile.save();
    }

    res.status(200).json({
      message: "Profile retrieved successfully",
      profile: profileObj,
      remainingViews: viewer ? viewer.remainingViews : 0,
    });
  } catch (error) {
    console.error("Error viewing profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Unlock contact details (consumes one remaining view)
exports.unlockContact = async (req, res) => {
  try {
    const userId = req.user._id;
    const { profileId } = req.params;

    if (userId.toString() === profileId) {
      return res.status(400).json({ message: "Cannot unlock your own contact" });
    }

    // Atomically decrement remainingViews by 1 for the viewer
    const updatedViewer = await User.findOneAndUpdate(
      {
        _id: userId,
        subscriptionStatus: "active",
        subscriptionEndDate: { $gt: new Date() },
        remainingViews: { $gt: 0 },
      },
      { $inc: { remainingViews: -1 } },
      { returnDocument: 'after' }
    );

    if (!updatedViewer) {
      return res.status(403).json({ message: "Upgrade required" });
    }

    const profile = await User.findById(profileId).select("phone email firstName lastName");
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    res.status(200).json({
      message: "Contact unlocked",
      contact: { phone: profile.phone, email: profile.email, name: profile.firstName },
      remainingViews: updatedViewer.remainingViews,
    });
  } catch (error) {
    console.error("unlockContact error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get visitors
exports.getVisitors = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const user = await User.findById(userId).populate({
      path: "visitors.userId",
      select: "-password",
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const visitors = user.visitors.slice((page - 1) * limit, page * limit);

    res.status(200).json({
      message: "Visitors retrieved successfully",
      visitors,
      pagination: {
        total: user.visitors.length,
        page,
        pages: Math.ceil(user.visitors.length / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching visitors:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Block user
exports.blockUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { blockedUserId } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { blockedUsers: blockedUserId },
      },
      { returnDocument: 'after' },
    ).select("-password");

    res.status(200).json({
      message: "User blocked successfully",
      user,
    });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Unblock user
exports.unblockUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { blockedUserId } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $pull: { blockedUsers: blockedUserId },
      },
      { returnDocument: 'after' },
    ).select("-password");

    res.status(200).json({
      message: "User unblocked successfully",
      user,
    });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get blocked users
exports.getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).populate({
      path: "blockedUsers",
      select: "-password",
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Blocked users retrieved successfully",
      blockedUsers: user.blockedUsers,
    });
  } catch (error) {
    console.error("Error fetching blocked users:", error);
    res.status(500).json({ message: "Server error" });
  }
};
