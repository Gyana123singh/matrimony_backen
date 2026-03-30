const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔥 ADD THIS (IMPORTANT)
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
    },

    packageName: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["initiated", "pending", "success", "failed", "refunded"],
      default: "initiated",
    },

    paymentMethod: {
      type: String,
      enum: ["stripe", "paypal", "wallet"],
      required: true,
    },

    transactionId: String,

    stripePaymentIntentId: String,

    description: String,

    duration: Number,

    startDate: Date,

    endDate: Date,

    metadata: mongoose.Schema.Types.Mixed,

    // ============================
    // 🔥 ADD THIS SECTION (MAIN FIX)
    // ============================

    features: {
      contactViews: { type: Number, default: 0 },
      interestExpress: { type: Number, default: 0 },
      imageUploads: { type: Number, default: 0 },
    },

    benefits: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);