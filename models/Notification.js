const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["interest", "message", "match", "visitor", "promo", "system"],
      required: true,
    },

    relatedUserId: mongoose.Schema.Types.ObjectId,

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: Date,

    data: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
