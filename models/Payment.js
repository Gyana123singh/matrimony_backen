const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
      default: "USD",
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

    duration: Number, // in days

    startDate: Date,

    endDate: Date,

    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
