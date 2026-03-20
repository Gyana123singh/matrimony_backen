const multer = require("multer");
const cloudinary = require("../config/coudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Storage config
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "users", // folder in cloudinary
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });

module.exports = upload;
