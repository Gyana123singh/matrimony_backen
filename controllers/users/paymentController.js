const Payment = require("../../models/Payment");
const Package = require("../../models/Package");
const User = require("../../models/User");

// Get available packages
exports.getPackages = async (req, res) => {
  try {
    const packages = await Package.find({ isActive: true }).sort({
      displayOrder: 1,
    });

    res.status(200).json({
      message: "Packages retrieved successfully",
      packages,
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create payment intent
exports.createPaymentIntent = async (req, res) => {
  try {
    const userId = req.user._id;
    const { packageId, paymentMethod } = req.body;

    const package = await Package.findById(packageId);

    if (!package) {
      return res.status(404).json({ message: "Package not found" });
    }

    const payment = new Payment({
      userId,
      packageName: package.name,
      amount: package.price,
      paymentMethod,
      description: `Subscription to ${package.name}`,
      duration: package.duration,
      status: "initiated",
    });

    // If payment method is stripe, you would create a stripe payment intent here
    if (paymentMethod === "stripe") {
      // Stripe integration would go here
      // payment.stripePaymentIntentId = paymentIntent.id;
    }

    await payment.save();

    res.status(201).json({
      message: "Payment intent created",
      payment,
      clientSecret: "client-secret-here", // Stripe secret here
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Confirm payment
exports.confirmPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { paymentId, transactionId } = req.body;

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    payment.status = "success";
    payment.transactionId = transactionId;
    payment.startDate = new Date();
    payment.endDate = new Date(
      Date.now() + payment.duration * 24 * 60 * 60 * 1000,
    );

    await payment.save();

    // Update user subscription
    const user = await User.findByIdAndUpdate(
      userId,
      {
        subscriptionPlan: payment.packageName,
        subscriptionStatus: "active",
        subscriptionStartDate: payment.startDate,
        subscriptionEndDate: payment.endDate,
        $inc: { totalSpent: payment.amount },
      },
      { new: true },
    );

    res.status(200).json({
      message: "Payment confirmed successfully",
      payment,
      user,
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const payments = await Payment.find({ userId, status: "success" })
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments({ userId, status: "success" });

    res.status(200).json({
      message: "Payment history retrieved successfully",
      payments,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get current subscription
exports.getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      "subscriptionPlan subscriptionStatus subscriptionStartDate subscriptionEndDate",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if subscription expired
    if (
      user.subscriptionStatus === "active" &&
      new Date() > user.subscriptionEndDate
    ) {
      user.subscriptionStatus = "expired";
      await user.save();
    }

    res.status(200).json({
      message: "Subscription retrieved successfully",
      subscription: {
        plan: user.subscriptionPlan,
        status: user.subscriptionStatus,
        startDate: user.subscriptionStartDate,
        endDate: user.subscriptionEndDate,
      },
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        subscriptionStatus: "inactive",
        subscriptionPlan: null,
      },
      { new: true },
    );

    res.status(200).json({
      message: "Subscription cancelled successfully",
      user,
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ message: "Server error" });
  }
};
