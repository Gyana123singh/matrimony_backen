const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Education', educationSchema);
