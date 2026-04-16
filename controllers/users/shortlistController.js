const User = require("../../models/User");
const Report = require("../../models/Report");

// Add to shortlist
exports.addToShortlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { profileId } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: {
          shortlist: {
            userId: profileId,
            addedAt: new Date(),
          },
        },
      },
      { returnDocument: 'after' },
    ).select("-password");

    res.status(200).json({
      message: "Profile added to shortlist",
      user,
    });
  } catch (error) {
    console.error("Error adding to shortlist:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove from shortlist
exports.removeFromShortlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { profileId } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $pull: { shortlist: { userId: profileId } },
      },
      { returnDocument: 'after' },
    ).select("-password");

    res.status(200).json({
      message: "Profile removed from shortlist",
      user,
    });
  } catch (error) {
    console.error("Error removing from shortlist:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get shortlist
exports.getShortlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const user = await User.findById(userId).populate({
      path: "shortlist.userId",
      select: "-password",
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const shortlist = user.shortlist.slice((page - 1) * limit, page * limit);

    res.status(200).json({
      message: "Shortlist retrieved successfully",
      shortlist,
      pagination: {
        total: user.shortlist.length,
        page,
        pages: Math.ceil(user.shortlist.length / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching shortlist:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Ignore profile
exports.ignoreProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { profileId } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { ignoredProfiles: profileId },
      },
      { returnDocument: 'after' },
    ).select("-password");

    res.status(200).json({
      message: "Profile ignored successfully",
      user,
    });
  } catch (error) {
    console.error("Error ignoring profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Report user
exports.reportUser = async (req, res) => {
  try {
    const reportedByUserId = req.user._id;
    const { reportedUserId, reason, description } = req.body;

    // Check if already reported
    const existingReport = await Report.findOne({
      reportedByUserId,
      reportedUserId,
    });

    if (existingReport) {
      return res
        .status(400)
        .json({ message: "You have already reported this user" });
    }

    const report = new Report({
      reportedByUserId,
      reportedUserId,
      reason,
      description,
      status: "pending",
    });

    await report.save();

    // Emit real-time notification to admins
    try {
      const io = req.app.get("io");
      if (io) {
        const populated = await Report.findById(report._id)
          .populate("reportedByUserId", "firstName lastName")
          .populate("reportedUserId", "firstName lastName profilePhoto");

        io.to("admin:all").emit("report:new", {
          _id: populated._id,
          reportedUser: populated.reportedUserId,
          reportedBy: populated.reportedByUserId,
          reason: populated.reason,
          description: populated.description,
          createdAt: populated.createdAt,
          status: populated.status,
        });
      }
    } catch (err) {
      console.error("Error emitting report event:", err);
    }

    res.status(201).json({
      message: "Report submitted successfully",
      report,
    });
  } catch (error) {
    console.error("Error submitting report:", error);
    res.status(500).json({ message: "Server error" });
  }
};
