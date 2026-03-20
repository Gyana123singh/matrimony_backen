const Interest = require("../../models/Interest");
const User = require("../../models/User");
const Notification = require("../../models/Notification");

// Send interest
exports.sendInterest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId, message } = req.body;

    if (senderId.toString() === receiverId) {
      return res
        .status(400)
        .json({ message: "You cannot send interest to yourself" });
    }

    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check block both ways
    if (
      receiver.blockedUsers.includes(senderId) ||
      sender.blockedUsers.includes(receiverId)
    ) {
      return res.status(403).json({ message: "User blocked" });
    }

    // Check existing match
    const alreadyMatched = sender.matches.some(
      (m) => m.userId.toString() === receiverId,
    );

    if (alreadyMatched) {
      return res.status(400).json({ message: "Already matched" });
    }

    // Check existing interest
    const existingInterest = await Interest.findOne({
      senderId,
      receiverId,
      status: { $in: ["pending", "accepted"] },
    });

    if (existingInterest) {
      return res.status(400).json({ message: "Interest already sent" });
    }

    const interest = await Interest.create({
      senderId,
      receiverId,
      message,
      status: "pending",
    });

    await Notification.create({
      userId: receiverId,
      title: `${sender.firstName} sent you an interest`,
      message: "Check your interests",
      type: "interest",
      relatedUserId: senderId,
    });

    res.status(201).json({
      success: true,
      interest,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get received interests
exports.getReceivedInterests = async (req, res) => {
  try {
    const receiverId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { receiverId };

    // ✅ allow all statuses
    if (status && status !== "all") {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const interests = await Interest.find(query)
      .populate("senderId", "-password")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Interest.countDocuments(query);

    res.status(200).json({
      message: "Interests retrieved successfully",
      interests,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching interests:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get sent interests
exports.getSentInterests = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { senderId };

    // ✅ allow all statuses if not provided
    if (status && status !== "all") {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const interests = await Interest.find(query)
      .populate("receiverId", "-password")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Interest.countDocuments(query);

    res.status(200).json({
      message: "Sent interests retrieved successfully",
      interests,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching sent interests:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Accept interest
exports.acceptInterest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { interestId } = req.params;

    const interest = await Interest.findById(interestId);

    if (!interest) {
      return res.status(404).json({ message: "Interest not found" });
    }

    if (interest.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    interest.status = "accepted";
    interest.acceptedAt = new Date();
    await interest.save();

    // Create match for both users
    await User.findByIdAndUpdate(interest.senderId, {
      $addToSet: {
        matches: {
          userId: interest.receiverId,
          matchedAt: new Date(),
        },
      },
    });

    await User.findByIdAndUpdate(interest.receiverId, {
      $addToSet: {
        matches: {
          userId: interest.senderId,
          matchedAt: new Date(),
        },
      },
    });

    await Notification.create({
      userId: interest.senderId,
      title: "Interest Accepted",
      message: "Your interest was accepted",
      type: "match",
      relatedUserId: interest.receiverId,
    });

    res.status(200).json({
      success: true,
      interest,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Reject interest
exports.rejectInterest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { interestId } = req.params;

    const interest = await Interest.findById(interestId);

    if (!interest) {
      return res.status(404).json({ message: "Interest not found" });
    }

    if (interest.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    interest.status = "rejected";
    interest.rejectedAt = new Date();
    await interest.save();

    res.status(200).json({
      message: "Interest rejected successfully",
      interest,
    });
  } catch (error) {
    console.error("Error rejecting interest:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Cancel sent interest
exports.cancelInterest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { interestId } = req.params;

    const interest = await Interest.findById(interestId);

    if (!interest) {
      return res.status(404).json({ message: "Interest not found" });
    }

    if (interest.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await interest.deleteOne();

    res.status(200).json({
      message: "Interest cancelled successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

