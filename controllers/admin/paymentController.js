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
    const { name, description, price, duration, features, displayOrder } =
      req.body;

    // Check if package already exists
    const existingPackage = await Package.findOne({ name });
    if (existingPackage) {
      return res.status(400).json({ message: "Package already exists" });
    }

    const package = new Package({
      name,
      description,
      price,
      duration,
      features,
      displayOrder: displayOrder || 0,
    });

    await package.save();

    res.status(201).json({
      message: "Package created successfully",
      package,
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
    const {
      name,
      description,
      price,
      duration,
      features,
      displayOrder,
      isActive,
    } = req.body;

    const package = await Package.findByIdAndUpdate(
      packageId,
      {
        name,
        description,
        price,
        duration,
        features,
        displayOrder,
        isActive,
      },
      { new: true, runValidators: true },
    );

    if (!package) {
      return res.status(404).json({ message: "Package not found" });
    }

    res.status(200).json({
      message: "Package updated successfully",
      package,
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
