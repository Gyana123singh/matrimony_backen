const mongoose = require("mongoose");

const interestSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },

    message: String,

    acceptedAt: Date,

    rejectedAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Interest", interestSchema);
