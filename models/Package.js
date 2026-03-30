const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,

      unique: true,
    },

    description: String,

    price: {
      type: Number,

    },
    interestLimit: { type: Number, default: 0 },
    profileLimit: { type: Number, default: 0 },
    imageLimit: { type: Number, default: 0 },
    validity: { type: Number, default: 0 },
    benefits: {
      type: [String],
      default: [],
    },
    currency: {
      type: String,
      default: "INR",
    },

    duration: {
      type: Number,
      // in days
    },
    features: {
      contactView: { type: Number, default: 0 },
      interestExpress: { type: Number, default: 0 },
      imageUpload: { type: Number, default: 0 },
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
