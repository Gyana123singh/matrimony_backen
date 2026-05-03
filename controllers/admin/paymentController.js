const Payment = require("../../models/Payment");
const Package = require("../../models/Package");

// Get all payments
exports.getAllPayments = async (req, res) => {
  try {
    const {
      status = "all",
      userId,
      page = 1,
      limit = 20,
      search,
      startDate,
      endDate,
    } = req.query;

    const query = {};

    // ✅ Status filter
    if (status !== "all") query.status = status;

    // ✅ User filter
    if (userId) query.userId = userId;

    // ✅ Date filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // ✅ Search filter (IMPORTANT)
    let userMatch = {};
    if (search) {
      userMatch = {
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }

    const skip = (page - 1) * limit;

    // 🔥 Step 1: Find matching users (for search)
    let userIds = [];
    if (search) {
      const users = await require("../../models/User")
        .find(userMatch)
        .select("_id");
      userIds = users.map((u) => u._id);
      query.userId = { $in: userIds };
    }

    // 🔥 Step 2: Fetch payments
    const payments = await Payment.find(query)
      .populate("userId", "firstName lastName email phone profilePhoto")
      .limit(Number(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      message: "Payments retrieved successfully",
      payments,
      pagination: {
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get payment details
exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId).populate(
      "userId",
      "-password",
    );

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json({
      message: "Payment details retrieved successfully",
      payment,
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark payment as completed
exports.markPaymentCompleted = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      {
        status: "success",
      },
      { returnDocument: "after" },
    ).populate("userId", "-password");

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Emit real-time update
    try {
      const io = req.app.get("io");
      if (io) {
        io.to("admin:all").emit("payment:updated", {
          paymentId: payment._id,
          status: payment.status,
        });

        if (payment.userId) {
          io.to(`user:${payment.userId}`).emit("payment:status", {
            paymentId: payment._id,
            status: payment.status,
          });
        }
      }
    } catch (err) {
      console.error("Error emitting payment update:", err);
    }

    res.status(200).json({
      message: "Payment marked as completed",
      payment,
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Refund payment
exports.refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      {
        status: "refunded",
      },
      { returnDocument: "after" },
    ).populate("userId", "-password");

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Emit real-time update
    try {
      const io = req.app.get("io");
      if (io) {
        io.to("admin:all").emit("payment:updated", {
          paymentId: payment._id,
          status: payment.status,
        });

        if (payment.userId) {
          io.to(`user:${payment.userId}`).emit("payment:status", {
            paymentId: payment._id,
            status: payment.status,
          });
        }
      }
    } catch (err) {
      console.error("Error emitting payment refund event:", err);
    }

    res.status(200).json({
      message: "Payment refunded successfully",
      payment,
    });
  } catch (error) {
    console.error("Error refunding payment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create package
exports.createPackage = async (req, res) => {
  try {
    const { name, price, validity, benefits } = req.body;

    // Basic validation
    if (!name || !price || !validity) {
      return res.status(400).json({
        message: "Name, price, and validity are required",
      });
    }

    // Check if package already exists
    const existingPackage = await Package.findOne({ name });
    if (existingPackage) {
      return res.status(400).json({ message: "Package already exists" });
    }

    // Clean benefits (remove empty values)
    const cleanBenefits = (benefits || []).filter((b) => b && b.trim() !== "");

    const newPackage = new Package({
      name,
      price,
      validity,
      benefits: cleanBenefits,
      isActive: true, // optional default
    });

    await newPackage.save();

    res.status(201).json({
      message: "Package created successfully",
      package: newPackage,
    });
  } catch (error) {
    console.error("Error creating package:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all packages
exports.getAllPackages = async (req, res) => {
  try {
    const packages = await Package.find().sort({ displayOrder: 1 });

    res.status(200).json({
      message: "Packages retrieved successfully",
      packages,
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update package
exports.updatePackage = async (req, res) => {
  try {
    const { packageId } = req.params;
    const { name, price, validity, benefits } = req.body;

    const cleanBenefits = (benefits || []).filter((b) => b && b.trim() !== "");

    const updatedPackage = await Package.findByIdAndUpdate(
      packageId,
      {
        name,
        price,
        validity,
        benefits: cleanBenefits,
      },
      { returnDocument: "after", runValidators: true },
    );

    if (!updatedPackage) {
      return res.status(404).json({ message: "Package not found" });
    }

    res.status(200).json({
      message: "Package updated successfully",
      package: updatedPackage,
    });
  } catch (error) {
    console.error("Error updating package:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete package
exports.deletePackage = async (req, res) => {
  try {
    const { packageId } = req.params;

    const package = await Package.findByIdAndDelete(packageId);

    if (!package) {
      return res.status(404).json({ message: "Package not found" });
    }

    res.status(200).json({
      message: "Package deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting package:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get payment stats
exports.getPaymentStats = async (req, res) => {
  try {
    const totalRevenue = await Payment.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const revenueByPackage = await Payment.aggregate([
      { $match: { status: "success" } },
      {
        $group: {
          _id: "$packageName",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const paymentStats = await Payment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      message: "Payment stats retrieved successfully",
      stats: {
        totalRevenue: totalRevenue[0]?.total || 0,
        byPackage: revenueByPackage,
        byStatus: paymentStats,
      },
    });
  } catch (error) {
    console.error("Error fetching payment stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// Toggle Package Status (Enable / Disable)
exports.togglePackageStatus = async (req, res) => {
  try {
    const { packageId, id } = req.params; // support both names
    const pkgId = packageId || id;

    const pkg = await Package.findById(pkgId);

    if (!pkg) {
      return res.status(404).json({ message: "Package not found" });
    }

    // ✅ Toggle boolean
    pkg.isActive = !pkg.isActive;

    await pkg.save();

    res.status(200).json({
      message: `Package ${pkg.isActive ? "enabled" : "disabled"} successfully`,
      package: pkg,
    });
  } catch (error) {
    console.error("Error toggling package:", error);
    res.status(500).json({ message: "Server error" });
  }
};
exports.getActivePackages = async (req, res) => {
  try {
    const packages = await Package.find({ isActive: true }).sort({
      displayOrder: 1,
    });

    res.status(200).json({
      message: "Active packages",
      packages,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.buyPackage = async (req, res) => {
  try {
    const { packageId } = req.body;
    const userId = req.user._id;

    const pkg = await Package.findById(packageId);
    if (!pkg) {
      return res.status(404).json({ message: "Package not found" });
    }

    // Create payment
    const payment = await Payment.create({
      userId,
      packageId: pkg._id, // ✅ add this

      amount: pkg.price,
      packageName: pkg.name,

      status: "initiated", // ✅ better than pending

      paymentMethod: "ccavenue", // ✅ gateway

      ccavenueOrderId: "ORD_" + Date.now(), // ✅ fake order id (temporary)

      transactionId: null, // ✅ will come after payment success
    });

    res.status(200).json({
      message: "Proceed to payment",
      payment,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
// Get renewal list (expiring packages)
exports.getRenewals = async (req, res) => {
  try {
    const { startDate, endDate, search } = req.query;

    const query = {
      status: "success",
    };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const payments = await Payment.find(query)
      .populate("userId", "firstName lastName phone profilePhoto photos image")
      .populate("packageId", "validity")
      .sort({ createdAt: -1 });

    const renewals = payments.map((p) => {
      // Choose profile image: explicit profilePhoto, photos.isProfile, fallback to image
      let photo = p.userId?.profilePhoto || null;
      if (!photo && Array.isArray(p.userId?.photos)) {
        const prof = p.userId.photos.find((ph) => ph.isProfile && ph.url);
        if (prof) photo = prof.url;
        else if (p.userId.photos[0]) photo = p.userId.photos[0].url;
      }
      if (!photo) photo = p.userId?.image || null;

      return {
        id: p._id,
        userName:
          `${p.userId?.firstName || ""} ${p.userId?.lastName || ""}`.trim(),
        packageName: p.packageName,
        // Use explicit start/end when available (from payment confirmation)
        startDate: p.startDate || p.createdAt,
        endDate:
          p.endDate ||
          new Date(
            (p.startDate || p.createdAt).getTime() +
              (p.duration || p.packageId?.validity || 30) * 24 * 60 * 60 * 1000,
          ),
        mobile: p.userId?.phone,
        amount: p.amount || 0,
        photo,
      };
    });

    res.status(200).json({
      message: "Renewals fetched",
      renewals,
    });
  } catch (error) {
    console.error("Error fetching renewals:", error);
    res.status(500).json({ message: "Server error" });
  }
};
