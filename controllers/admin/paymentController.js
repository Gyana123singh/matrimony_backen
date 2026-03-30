const Payment = require("../../models/Payment");
const Package = require("../../models/Package");

// Get all payments
exports.getAllPayments = async (req, res) => {
  try {
    const { status = "all", userId, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status !== "all") query.status = status;
    if (userId) query.userId = userId;

    const skip = (page - 1) * limit;

    const payments = await Payment.find(query)
      .populate("userId", "firstName lastName email phone")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      message: "Payments retrieved successfully",
      payments,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
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
      { new: true },
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
      { new: true },
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
    const {
      name,
      price,
      interestLimit,
      interestExpress,   // NEW
      profileLimit,
      imageLimit,
      contactView,       // NEW
      validity,
      description,       // NEW
      benefits,
    } = req.body;

    // Check if package already exists
    const existingPackage = await Package.findOne({ name });
    if (existingPackage) {
      return res.status(400).json({ message: "Package already exists" });
    }

    const newPackage = new Package({
      name,
      price,
      interestLimit,
      interestExpress,
      profileLimit,
      imageLimit,
      contactView,
      validity,
      description,
      benefits,
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

    const updatedPackage = await Package.findByIdAndUpdate(
      packageId,
      { ...req.body },
      { returnDocument: "after", runValidators: true }
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
    const { id } = req.params;

    const pkg = await Package.findById(id);

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
      amount: pkg.price,
      packageName: pkg.name,
      status: "pending",
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
      .populate("userId", "firstName lastName phone")
      .sort({ createdAt: -1 });

    const renewals = payments.map((p) => ({
      id: p._id,
      userName: `${p.userId?.firstName || ""} ${p.userId?.lastName || ""}`,
      packageName: p.packageName,
      startDate: p.createdAt,
      endDate: new Date(
        new Date(p.createdAt).setDate(
          new Date(p.createdAt).getDate() + 30
        )
      ), // example validity
      mobile: p.userId?.phone,
    }));

    res.status(200).json({
      message: "Renewals fetched",
      renewals,
    });
  } catch (error) {
    console.error("Error fetching renewals:", error);
    res.status(500).json({ message: "Server error" });
  }
};