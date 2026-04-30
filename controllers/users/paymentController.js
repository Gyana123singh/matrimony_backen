const Payment = require("../../models/Payment");
const Package = require("../../models/Package");
const User = require("../../models/User");
const Notification = require("../../models/Notification");
const ccav = require("../../util/ccavutil");

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

// ===============================
// CREATE PAYMENT INTENT
// ===============================
exports.createPaymentIntent = async (req, res) => {
  try {
    const mongoose = require("mongoose"); // ✅ ensure this is available

    const userId = req.user._id;
    const { packageId } = req.body;

    const package = await Package.findById(packageId);

    if (!package) {
      return res.status(404).json({ message: "Package not found" });
    }

    const duration = Number(package.duration || package.validity);

    if (!duration || isNaN(duration)) {
      return res.status(400).json({
        message: "Invalid package duration",
      });
    }

    // 🔥 ENV VARIABLES
    const merchant_id = process.env.CCAVENUE_MERCHANT_ID;
    const access_code = process.env.CCAVENUE_ACCESS_CODE;
    const working_key = process.env.CCAVENUE_WORKING_KEY;
    const redirect_url = process.env.CCAVENUE_REDIRECT_URL;
    const cancel_url = process.env.CCAVENUE_CANCEL_URL;

    // 🔥 PARSE BENEFITS
    const parseBenefits = require("../../util/parseBenefits"); // ✅ FIX PATH
    const limits = parseBenefits(package.benefits);

    // 🔥 GENERATE ORDER ID FIRST (IMPORTANT)
    const order_id = "order_" + new mongoose.Types.ObjectId();

    // 🔥 CREATE PAYMENT (WITH ORDER ID)
    const payment = new Payment({
      userId,
      packageId: package._id,
      packageName: package.name,
      amount: package.price,
      paymentMethod: "ccavenue",
      description: `Subscription to ${package.name}`,
      duration,
      status: "initiated",

      ccavenueOrderId: order_id, // ✅ FIXED HERE

      limits,
      benefits: package.benefits || [],
    });

    // ✅ SAVE ONLY ONCE
    await payment.save();

    // 🔥 PARAM STRING FOR CCAVENUE
    const params = [
      `merchant_id=${merchant_id}`,
      `order_id=${order_id}`,
      `currency=INR`,
      `amount=${package.price}`,
      `redirect_url=${redirect_url}`,
      `cancel_url=${cancel_url}`,
      `language=EN`,
      `merchant_param1=${userId}`,
      `merchant_param2=${package._id}`,
      `merchant_param3=${package.name}`,
    ];

    const paramString = params.join("&");

    console.log("PARAM STRING:", paramString);

    const encRequest = ccav.encrypt(paramString, working_key);

    console.log("ENC REQUEST:", encRequest);

    return res.status(201).json({
      paymentId: payment._id,
      orderId: order_id, // ✅ useful for frontend
      ccavenue: {
        access_code,
        encRequest,
      },
    });
  } catch (error) {
    console.error("❌ Create Payment Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// CONFIRM PAYMENT
// ===============================
exports.confirmPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { paymentId, transactionId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ message: "paymentId is missing" });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Prevent duplicate confirmation
    if (payment.status === "success") {
      return res.status(400).json({ message: "Payment already confirmed" });
    }

    // Update payment record only. Do NOT activate user subscription here.
    // Activation must happen only from the CCAvenue response endpoint to
    // avoid duplicate/forged activations.
    payment.status = "success";
    payment.transactionId = transactionId;

    const startDate = new Date();
    const endDate = new Date(
      Date.now() + payment.duration * 24 * 60 * 60 * 1000,
    );

    payment.startDate = startDate;
    payment.endDate = endDate;

    await payment.save();

    return res.status(200).json({
      message:
        "Payment recorded. Subscription activation will occur via payment gateway response.",
      payment,
    });
  } catch (error) {
    console.error("❌ Confirm Payment Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ===============================
// PAYMENT HISTORY
// ===============================
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

// ===============================
// CURRENT SUBSCRIPTION
// ===============================
exports.getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      "subscriptionPlan subscriptionStatus subscriptionStartDate subscriptionEndDate",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Auto-expire
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

// ===============================
// CANCEL SUBSCRIPTION
// ===============================
exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        subscriptionStatus: "inactive",
        subscriptionPlan: null,
      },
      { returnDocument: "after" },
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
