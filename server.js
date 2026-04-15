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
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax", // ✅ FIX
      maxAge: 5 * 60 * 1000,
    },
  })
);

// ================== ROUTES ==================

app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
// Public success stories (no auth)
app.use("/api/success-stories", publicSuccessRoutes);
// ================== CCAvenue Response ==================

app.post("/api/payments/ccavenue/response", async (req, res) => {
  try {
    const ccav = require("./utils/ccavutil");
    const Payment = require("./models/Payment");
    const User = require("./models/User");

    const workingKey = process.env.CCAVENUE_WORKING_KEY;
    const encResp = req.body.encResp;

    // ✅ CORRECT DECRYPTION
    const decrypted = ccav.decrypt(encResp, workingKey);

    console.log("🔓 Decrypted Response:", decrypted);

    const response = Object.fromEntries(
      decrypted.split("&").map((item) => item.split("="))
    );

    const order_id = response.order_id;
    const order_status = response.order_status;

    const payment = await Payment.findOne({
      ccavenueOrderId: order_id,
    });

    if (!payment) {
      return res.send("Payment not found");
    }
    // Security: validate merchant_param1 matches payment.userId (if present)
    const merchantUserId = response.merchant_param1;
    if (merchantUserId && merchantUserId !== payment.userId.toString()) {
      console.warn(`Merchant param user mismatch: ${merchantUserId} != ${payment.userId}`);
      payment.status = "failed";
      await payment.save();
      return res.send("User mismatch");
    }

    // Idempotency: if payment already marked success, do not re-activate
    if (payment.status === "success") {
      return res.redirect("https://marathishubhavivah.com/user/payment-success");
    }

    if (order_status === "Success") {
      payment.status = "success";
      payment.transactionId = response.tracking_id || response.tracking_id || "";

      const startDate = new Date();
      const endDate = new Date(
        Date.now() + (payment.duration || 0) * 24 * 60 * 60 * 1000
      );

      payment.startDate = startDate;
      payment.endDate = endDate;

      await payment.save();

      // Activate user's subscription ONLY from this trusted response
      await User.findByIdAndUpdate(payment.userId, {
        subscriptionPlan: payment.packageName,
        subscriptionStatus: "active",
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,

        subscriptionFeatures: payment.features,
        subscriptionBenefits: payment.benefits,

        remainingViews: payment.features.contactViews,
        remainingInterests: payment.features.interestExpress,
        remainingUploads: payment.features.imageUploads,
        $inc: { totalSpent: payment.amount },
      });

      // Emit dashboard update for admins (payment success from gateway)
      try {
        if (app && app.get) {
          const io = app.get('io');
          if (io) {
            io.to('admin:all').emit('dashboard:graphUpdated', {
              type: 'payment:success',
              payment: { _id: payment._id, amount: payment.amount, createdAt: payment.createdAt },
            });
          }
        }
      } catch (e) {
        console.warn('Failed to emit dashboard update in CCAV response:', e);
      }

      return res.redirect("https://marathishubhavivah.com/user/payment-success");
    } else {
      payment.status = "failed";
      await payment.save();

      return res.redirect("https://marathishubhavivah.com/user/payment-failed");
    }
  } catch (error) {
    console.error("❌ Response Error:", error);
    res.status(500).send("Error processing payment");
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
        { $set: { subscriptionStatus: "expired" } }
      );
      console.log(`Cron: expired subscriptions updated: ${result.modifiedCount}`);
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
