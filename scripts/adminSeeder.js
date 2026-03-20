const User = require("../models/User");
const bcrypt = require("bcryptjs");

const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: "admin" });

    if (adminExists) {
      console.log("Admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    const admin = new User({
      firstName: "Super",
      lastName: "Admin",
      email: "admin@matrimonial.com",
      password: hashedPassword,
      role: "admin",
    });

    await admin.save();

    console.log("Admin created");
  } catch (error) {
    console.error("Admin seed error", error);
  }
};

module.exports = seedAdmin;
