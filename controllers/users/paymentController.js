const Payment = require("../../models/Payment");
const Package = require("../../models/Package");
const User = require("../../models/User");
const Notification = require("../../models/Notification");
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
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
    const { packageId } = req.body;

    const package = await Package.findOne({ name: packageId });

    if (!package) {
      return res.status(404).json({ message: "Package not found" });
    }

    // 🔥 CREATE STRIPE PAYMENT INTENT
    const paymentIntent = await stripe.paymentIntents.create({
      amount: package.price * 100, // paise (₹)
      currency: "inr",
      metadata: {
        userId: userId.toString(),
        packageId: package._id.toString(),
      },
    });

    // SAVE PAYMENT
    const payment = new Payment({
      userId,
      packageName: package.name,
      amount: package.price,
      paymentMethod: "stripe",
      description: `Subscription to ${package.name}`,
      duration: package.duration,
      status: "initiated",
      stripePaymentIntentId: paymentIntent.id,
    });

    await payment.save();

    res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error(error);
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




exports.confirmPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { paymentId, transactionId } = req.body;

    const payment = await Payment.findById(paymentId);
    const package = await Package.findOne({ name: payment.packageName });

    if (!payment || !package) {
      return res.status(404).json({ message: "Invalid payment" });
    }

    payment.status = "success";
    payment.transactionId = transactionId;

    const startDate = new Date();
    const endDate = new Date(
      Date.now() + package.duration * 24 * 60 * 60 * 1000
    );

    payment.startDate = startDate;
    payment.endDate = endDate;

    await payment.save();

    // ✅ UPDATE USER SUBSCRIPTION + FEATURES
    const user = await User.findByIdAndUpdate(
      userId,
      {
        subscriptionPlan: package.name,
        subscriptionStatus: "active",
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,

        subscriptionFeatures: {
          contactViews: package.contactViews,
          interestExpress: package.interestExpress,
          imageUploads: package.imageUploads,
        },

        $inc: { totalSpent: package.price },
      },
      { new: true }
    );

    // ✅ CREATE NOTIFICATION
    await Notification.create({
      userId,
      title: "Subscription Activated 🎉",
      message: `Your ${package.name} plan is now active`,
      type: "promo",
    });

    // ✅ SOCKET REALTIME
    const io = req.app.get("io");
    io.to(`user:${userId}`).emit("notification:new", {
      title: "Subscription Activated 🎉",
      message: `Your ${package.name} plan is active`,
    });

    res.status(200).json({
      message: "Payment successful",
      payment,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};