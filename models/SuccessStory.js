const mongoose = require("mongoose");

const successStorySchema = new mongoose.Schema(
  {
    brideName: {
      type: String,
      required: true,
    },
    groomName: {
      type: String,
      required: true,
    },
    image: {
      type: String, // Cloudinary URL
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SuccessStory", successStorySchema);