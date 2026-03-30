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

    const package = await Package.findById(packageId);

    if (!package) {
      return res.status(404).json({ message: "Package not found" });
    }

    // ✅ FIX: Use duration OR validity
    const duration = Number(package.duration || package.validity);

    if (!duration || isNaN(duration)) {
      return res.status(400).json({
        message: "Invalid package duration/validity",
      });
    }

    // 🔥 CREATE STRIPE PAYMENT INTENT
    const paymentIntent = await stripe.paymentIntents.create({
      amount: package.price * 100,
      currency: "inr",
      metadata: {
        userId: userId.toString(),
        packageId: package._id.toString(),
      },
    });

    // ✅ SAVE PAYMENT
    const payment = new Payment({
      userId,
      packageName: package.name,
      amount: package.price,
      paymentMethod: "stripe",
      description: `Subscription to ${package.name}`,
      duration: duration, // ✅ FIXED
      status: "initiated",
      stripePaymentIntentId: paymentIntent.id,
    });

    await payment.save();

    res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("❌ Create Payment Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Confirm payment
exports.confirmPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { paymentId, transactionId } = req.body;

    console.log("Confirm Payment:", { paymentId, transactionId });

    if (!paymentId) {
      return res.status(400).json({ message: "paymentId is missing" });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const package = await Package.findOne({ name: payment.packageName });

    if (!package) {
      return res.status(404).json({ message: "Package not found" });
    }

    // ✅ FIX: Safe duration handling
    const duration = Number(package.duration || package.validity);

    if (!duration || isNaN(duration)) {
      return res.status(400).json({
        message: "Invalid package duration/validity",
      });
    }

    // ✅ Update payment
    payment.status = "success";
    payment.transactionId = transactionId;

    const startDate = new Date();
    const endDate = new Date(
      Date.now() + duration * 24 * 60 * 60 * 1000
    );

    payment.startDate = startDate;
    payment.endDate = endDate;

    await payment.save();

    // ✅ Update user subscription
    const user = await User.findByIdAndUpdate(
      userId,
      {
        subscriptionPlan: package.name,
        subscriptionStatus: "active",
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        subscriptionFeatures: {
          contactViews: package.features?.contactView || 0,
          interestExpress: package.features?.interestExpress || 0,
          imageUploads: package.features?.imageUpload || 0,
        },
        $inc: { totalSpent: package.price },
      },
      { new: true }
    );

    // ✅ Notification
    await Notification.create({
      userId,
      title: "Subscription Activated 🎉",
      message: `Your ${package.name} plan is now active`,
      type: "promo",
    });

    // ✅ Socket
    const io = req.app.get("io");
    io.to(`user:${userId}`).emit("notification:new", {
      title: "Subscription Activated 🎉",
      message: `Your ${package.name} plan is active`,
    });

    return res.status(200).json({
      message: "Payment successful",
      payment,
      user,
    });

  } catch (error) {
    console.error("❌ Confirm Payment Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
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

