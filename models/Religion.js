const mongoose = require('mongoose');

const religionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Religion', religionSchema);
