const Interest = require("../../models/Interest");
const User = require("../../models/User");

exports.getAllInterests = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 15 } = req.query;

    const query = {};

    // filter by status
    if (status && status !== "all") {
      query.status = status.toLowerCase();
    }

    // pagination
    const skip = (page - 1) * limit;

    let interests = await Interest.find(query)
      .populate("senderId", "firstName lastName username profilePhoto")
      .populate("receiverId", "firstName lastName username profilePhoto")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // 🔍 search filter (frontend style)
    if (search) {
      interests = interests.filter((i) => {
        const sender = `${i.senderId?.firstName} ${i.senderId?.lastName}`.toLowerCase();
        const receiver = `${i.receiverId?.firstName} ${i.receiverId?.lastName}`.toLowerCase();

        return (
          sender.includes(search.toLowerCase()) ||
          receiver.includes(search.toLowerCase())
        );
      });
    }

    const total = await Interest.countDocuments(query);

    res.status(200).json({
      message: "All interests fetched",
      interests,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin interest error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
exports.getAllIgnoredProfiles = async (req, res) => {
  try {
    const { search, page = 1, limit = 15 } = req.query;

    const skip = (page - 1) * limit;

    // Find users who have ignoredProfiles array not empty
    const usersWithIgnored = await User.find({ ignoredProfiles: { $exists: true, $ne: [] } })
      .select("firstName lastName username profilePhoto ignoredProfiles")
      .populate("ignoredProfiles", "firstName lastName username profilePhoto")
      .sort({ createdAt: -1 });

    // Flatten into pair list: { userId, ignoredUserId }
    let list = [];
    usersWithIgnored.forEach((u) => {
      const userInfo = {
        _id: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        profilePhoto: u.profilePhoto,
      };

      (u.ignoredProfiles || []).forEach((ignored) => {
        list.push({ userId: userInfo, ignoredUserId: ignored });
      });
    });

    // Search filter across user or profile
    let filtered = list;
    if (search) {
      filtered = list.filter((item) => {
        const user = `${item.userId?.firstName || ""} ${item.userId?.lastName || ""}`.toLowerCase();
        const profile = `${item.ignoredUserId?.firstName || ""} ${item.ignoredUserId?.lastName || ""}`.toLowerCase();
        return user.includes(search.toLowerCase()) || profile.includes(search.toLowerCase());
      });
    }

    const total = filtered.length;
    const paged = filtered.slice(skip, skip + Number(limit));

    res.status(200).json({
      message: "Ignored profiles fetched",
      ignoredProfiles: paged,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Ignored profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};