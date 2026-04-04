const Payment = require("../../models/Payment");
const Package = require("../../models/Package");
const User = require("../../models/User");
const Notification = require("../../models/Notification");
const crypto = require("crypto");

/**
 * Encrypt parameters for CCAvenue using AES-128-CBC.
 * Returns a base64-encoded encrypted string suitable for the `encRequest` field.
 */
function encryptCCAvenue(plainText, workingKey) {
  const crypto = require("crypto");

  // ✅ IMPORTANT FIX (MD5 key generation)
  const key = crypto.createHash("md5").update(workingKey).digest();

  const iv = Buffer.alloc(16, 0);

  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);

  let encrypted = cipher.update(plainText, "utf8", "base64");
  encrypted += cipher.final("base64");

  return encrypted;
}
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
    const userId = req.user._id;
    const { packageId } = req.body;

    const package = await Package.findById(packageId);

    if (!package) {
      return res.status(404).json({ message: "Package not found" });
    }

    // ✅ Duration safe handling
    const duration = Number(package.duration || package.validity);

    if (!duration || isNaN(duration)) {
      return res.status(400).json({
        message: "Invalid package duration/validity",
      });
    }

    // 🔥 CREATE CCAvenue REQUEST
    // Build order parameters required by CCAvenue and encrypt them using the working key.
    const merchant_id = process.env.CCAVENUE_MERCHANT_ID;
    const access_code = process.env.CCAVENUE_ACCESS_CODE;
    const working_key = process.env.CCAVENUE_WORKING_KEY; // used for encryption
    const redirect_url = process.env.CCAVENUE_REDIRECT_URL;
    const cancel_url = process.env.CCAVENUE_CANCEL_URL;

    // create payment document first to generate an order id
    const payment = new Payment({
      userId,
      packageId: package._id,
      packageName: package.name,
      amount: package.price,
      paymentMethod: "ccavenue",
      description: `Subscription to ${package.name}`,
      duration: duration,
      status: "initiated",
      // We'll store the CCAvenue order id after saving the payment (orderId uses payment._id)

      // 🔥 SAVE FEATURES
      features: {
        contactViews: package.features?.contactView || 0,
        interestExpress: package.features?.interestExpress || 0,
        imageUploads: package.features?.imageUpload || 0,
      },

      // 🔥 SAVE BENEFITS
      benefits: package.benefits || [],
    });

    await payment.save();

    // Create an order id for CCAvenue (use payment id with prefix)
    const order_id = `order_${payment._id}`;
    payment.ccavenueOrderId = order_id;
    await payment.save();

    // Build parameter string for CCAvenue
    const params = [];
    params.push(`merchant_id=${merchant_id}`);
    params.push(`order_id=${order_id}`);
    params.push(`amount=${package.price}`);
    params.push(`currency=INR`);
    if (redirect_url) params.push(`redirect_url=${redirect_url}`);
    if (cancel_url) params.push(`cancel_url=${cancel_url}`);
    params.push(`language=EN`);

    // Optional: attach user metadata so we can reconcile on return
    params.push(`merchant_param1=${userId}`);
    params.push(`merchant_param2=${package._id}`);
    params.push(`merchant_param3=${package.name}`);

    const paramString = params.join("&");
    console.log("PARAM STRING:", paramString);
    console.log("WORKING KEY:", working_key);

    // Encrypt using working key
    const encRequest = encryptCCAvenue(paramString, working_key || "");
    console.log("ENC REQUEST:", encRequest);
    return res.status(201).json({
      paymentId: payment._id,
      ccavenue: {
        merchant_id,
        access_code,
        order_id,
        amount: package.price,
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

    // ✅ Prevent duplicate confirmation
    if (payment.status === "success") {
      return res.status(400).json({ message: "Payment already confirmed" });
    }

    // ✅ Update payment
    payment.status = "success";
    payment.transactionId = transactionId;

    const startDate = new Date();
    const endDate = new Date(
      Date.now() + payment.duration * 24 * 60 * 60 * 1000
    );

    payment.startDate = startDate;
    payment.endDate = endDate;

    await payment.save();

    // ✅ UPDATE USER USING PAYMENT SNAPSHOT
    const user = await User.findByIdAndUpdate(
      userId,
      {
        subscriptionPlan: payment.packageName,
        subscriptionStatus: "active",
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,

        // 🔥 USE SAVED FEATURES
        subscriptionFeatures: payment.features,
        subscriptionBenefits: payment.benefits,

        $inc: { totalSpent: payment.amount },
      },
      { new: true }
    );

    // ✅ CREATE NOTIFICATION
    await Notification.create({
      userId,
      title: "Subscription Activated 🎉",
      message: `Your ${payment.packageName} plan is now active`,
      type: "promo",
    });

    // ✅ SOCKET EMIT
    const io = req.app.get("io");
    io.to(`user:${userId}`).emit("notification:new", {
      title: "Subscription Activated 🎉",
      message: `Your ${payment.packageName} plan is active`,
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
      "subscriptionPlan subscriptionStatus subscriptionStartDate subscriptionEndDate"
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
      { new: true }
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

