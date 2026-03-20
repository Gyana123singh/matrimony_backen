const express = require("express");
const router = express.Router();
const upload = require("../../middleware/multerUpload");
const {
  registerUser,
  loginUser,
  generateCaptcha,
  sendOTP,
  verifyOTP,
} = require("../../controllers/users/authController");

const { protect } = require("../../middleware/auth.middleware");

router.post("/register", upload.single("image"), registerUser);
router.post("/login", loginUser);
router.get("/captcha", generateCaptcha);
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);

module.exports = router;
