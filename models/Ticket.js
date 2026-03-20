const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    subject: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: ["technical", "payment", "profile", "account", "other"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "assigned", "in_progress", "answered", "closed"],
      default: "pending",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    assignedToAdmin: mongoose.Schema.Types.ObjectId,

    replies: [
      {
        senderType: { type: String, enum: ["user", "admin"] },
        senderId: mongoose.Schema.Types.ObjectId,
        message: String,
        attachments: [String],
        createdAt: { type: Date, default: Date.now },
      },
    ],

    closedAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Ticket", ticketSchema);
