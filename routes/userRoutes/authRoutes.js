const express = require("express");
const router = express.Router();
const upload = require("../../middleware/multerUpload");
const {
  registerUser,
  loginUser,
  generateCaptcha,
  sendOTP,
  verifyOTP,
  forgotPassword,
  resetPassword,
  logoutUser,
} = require("../../controllers/users/authController");


const { protect } = require("../../middleware/auth.middleware");

// Accept single or multiple images (any field name). Controller enforces max 5.
router.post("/register", upload.any(), registerUser);
router.post("/login", loginUser);
router.get("/captcha", generateCaptcha);
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/logout", protect, logoutUser);


module.exports = router;
