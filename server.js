const express = require("express");
const cors = require("cors");
const connectDB = require("./config/dbConnection");
const http = require("http");
const session = require("express-session");
const socketIo = require("socket.io");
require("dotenv").config();

// ================== SOCKET EVENTS ==================
const initializeSocketEvents = require("./socketEvents/index");

// ================== ROUTES ==================
const userRoutes = require("./routes/userRoutes/index");
const adminRoutes = require("./routes/adminRoutes/index");
const publicSuccessRoutes = require("./routes/userRoutes/successStoryRoutes");
const seedAdmin = require("./scripts/adminSeeder");

const app = express();

// ================== DATABASE ==================
connectDB();
seedAdmin();

// ================== MIDDLEWARES ==================

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "https://marathishubhavivah.com"
        : [
            "http://localhost:5174",
            "http://localhost:5173",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:5173",
            "https://marathishubhavivah.com",
          ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ================== SESSION ==================
app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // ✅ FIX
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // ✅ FIX
      maxAge: 5 * 60 * 1000,
    },
  }),
);

// ================== ROUTES ==================

app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
// Public success stories (no auth)
app.use("/api/success-stories", publicSuccessRoutes);

// ================== CCAvenue Response ==================

app.post("/api/payments/ccavenue/response", async (req, res) => {
  try {
    const ccav = require("./util/ccavutil");
    const Payment = require("./models/Payment");
    const User = require("./models/User");

    const workingKey = process.env.CCAVENUE_WORKING_KEY;

    // ✅ FIX: handle both formats
    const encResp = req.body.encResp || req.body.enc_response;

    console.log("📦 BODY RECEIVED:", req.body);
    console.log("🔐 ENC RESP:", encResp);

    if (!encResp) {
      console.error("❌ encResp missing");
      return res.send("Invalid payment response");
    }

    // ✅ decrypt
    const decrypted = ccav.decrypt(encResp, workingKey);

    console.log("🔓 Decrypted Response:", decrypted);

    const response = Object.fromEntries(
      decrypted.split("&").map((item) => item.split("=")),
    );

    const order_id = response.order_id;
    const order_status = response.order_status;

    console.log("ORDER STATUS:", order_status);
    console.log("ORDER ID:", order_id);

    let payment = await Payment.findOne({
      ccavenueOrderId: order_id,
    });

    // 🔥 fallback fix
    if (!payment && order_id && order_id.includes("order_")) {
      const id = order_id.replace("order_", "");
      payment = await Payment.findById(id);
    }

    if (!payment) {
      console.error("❌ Payment not found");
      return res.send("Payment not found");
    }

    // 🔒 Security check
    const merchantUserId = response.merchant_param1;
    if (merchantUserId && merchantUserId !== payment.userId.toString()) {
      console.warn(`❌ User mismatch: ${merchantUserId} != ${payment.userId}`);
      payment.status = "failed";
      await payment.save();
      return res.send("User mismatch");
    }

    // 🔁 Prevent duplicate processing
    if (payment.status === "success") {
      return res.redirect(
        "https://marathishubhavivah.com/user/payment-success",
      );
    }

    // ================= SUCCESS =================
    if (order_status && order_status.toLowerCase() === "success") {
      payment.status = "success";
      payment.transactionId = response.tracking_id || "";

      const startDate = new Date();
      const endDate = new Date(
        Date.now() + (payment.duration || 0) * 24 * 60 * 60 * 1000,
      );

      payment.startDate = startDate;
      payment.endDate = endDate;

      await payment.save();

      // ✅ Activate user subscription
      await User.findByIdAndUpdate(payment.userId, {
        subscriptionPlan: payment.packageName,
        subscriptionStatus: "active",
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,

        subscriptionBenefits: payment.benefits || [],

        remainingViews: payment.limits?.contactViews || 0,
        remainingInterests: payment.limits?.interestExpress || 0,

        canMessage: payment.limits?.canMessage || false,

        basicSearch: payment.limits?.basicSearch || false,
        advancedSearch: payment.limits?.advancedSearch || false,

        canViewVisitors: payment.limits?.canViewVisitors || false,
        canSeeViewers: payment.limits?.canSeeViewers || false,

        priorityListing: payment.limits?.priorityListing || false,
        topListing: payment.limits?.topListing || false,
        profileHighlight: payment.limits?.profileHighlight || false,

        whatsappAlerts: payment.limits?.whatsappAlerts || false,
        support: payment.limits?.support || false,

        $inc: { totalSpent: payment.amount },
      });

      console.log("✅ Payment SUCCESS & Subscription Activated");

      return res.redirect(
        "https://marathishubhavivah.com/user/payment-success",
      );
    }

    // ================= FAILED =================
    else {
      payment.status = "failed";
      await payment.save();

      console.log("❌ Payment FAILED");

      return res.redirect("https://marathishubhavivah.com/user/payment-failed");
    }
  } catch (error) {
    console.error("❌ Response Error:", error);
    res.status(500).send("Error processing payment");
  }
});

// ================== CCAvenue Cancel ==================

app.post("/api/payments/ccavenue/cancel", async (req, res) => {
  try {
    const ccav = require("./util/ccavutil");
    const Payment = require("./models/Payment");

    const workingKey = process.env.CCAVENUE_WORKING_KEY;
    const encResp = req.body.encResp;

    const decrypted = ccav.decrypt(encResp, workingKey);

    console.log("❌ Cancel Decrypted:", decrypted);

    const response = Object.fromEntries(
      decrypted.split("&").map((item) => item.split("=")),
    );

    const order_id = response.order_id;

    let payment = await Payment.findOne({
      ccavenueOrderId: order_id,
    });

    // fallback (same as success)
    if (!payment && order_id && order_id.includes("order_")) {
      const id = order_id.replace("order_", "");
      payment = await Payment.findById(id);
    }

    if (!payment) {
      return res.send("Payment not found");
    }

    // ✅ mark as failed
    payment.status = "failed";
    await payment.save();

    console.log("❌ Payment marked as failed:", payment._id);

    // redirect to frontend
    return res.redirect("https://marathishubhavivah.com/user/payment-failed");
  } catch (error) {
    console.error("❌ Cancel Error:", error);
    res.status(500).send("Error processing cancel");
  }
});
// ================== HEALTH CHECK ==================

app.get("/", (req, res) => {
  res.send("Matrimonial Backend Is Running");
});

// ================== SOCKET.IO SETUP ==================

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Initialize all socket events
initializeSocketEvents(io);

// Make io accessible to request handlers via req.app.get('io')
app.set("io", io);

// ================== SCHEDULED JOBS ==================
try {
  const cron = require("node-cron");
  const User = require("./models/User");

  // Run every day at 00:05 server time
  cron.schedule("5 0 * * *", async () => {
    try {
      const now = new Date();
      const result = await User.updateMany(
        { subscriptionStatus: "active", subscriptionEndDate: { $lt: now } },
        { $set: { subscriptionStatus: "expired" } },
      );
      console.log(
        `Cron: expired subscriptions updated: ${result.modifiedCount}`,
      );
    } catch (err) {
      console.error("Cron job error:", err);
    }
  });
} catch (err) {
  console.warn("node-cron not available, skipping scheduled jobs");
}

// ================== SERVER ==================

const PORT = process.env.PORT || 5002;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⚡ WebSocket server active`);
});

module.exports = app;
