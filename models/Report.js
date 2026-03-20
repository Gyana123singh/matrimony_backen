const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reportedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reason: {
      type: String,
      enum: [
        "inappropriate_content",
        "fake_profile",
        "harassment",
        "scam",
        "other",
      ],
      required: true,
    },

    description: String,

    status: {
      type: String,
      enum: ["pending", "reviewing", "resolved", "dismissed"],
      default: "pending",
    },

    adminNotes: String,

    action: {
      type: String,
      enum: ["none", "warning", "suspend", "ban"],
      default: "none",
    },

    resolvedAt: Date,

    resolvedByAdmin: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Report", reportSchema);
