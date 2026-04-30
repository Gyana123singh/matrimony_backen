const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    validity: {
      type: Number,
      required: true,
    },

    benefits: {
      type: [String],
      default: [],
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["Active", "Disabled"],
      default: "Active",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Package", packageSchema);
