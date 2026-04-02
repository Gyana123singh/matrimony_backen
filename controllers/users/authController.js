const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const svgCaptcha = require("svg-captcha");
const jwt = require("jsonwebtoken");
const sendSMS = require("../../util/sendSMS");

exports.registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      gender,
      dateOfBirth,
      birthTime,
      birthName,
      height,
      complexion,
      bloodGroup,
      education,
      fieldOfStudy,
      job,
      jobLocation,
      annualIncome,

      // ✅ NEW FIELDS
      religion,
      caste,

      fatherName,
      fatherJob,
      motherName,
      motherJob,
      siblings,
      paternalUncleName,
      paternalUncleJob,
      maternalUncleName,
      maternalUncleJob,
    } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Get uploaded image URL from cloudinary
    let imageUrl = "";
    if (req.file) {
      imageUrl = req.file.path; // Cloudinary URL
    }

    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      gender,
      dateOfBirth,
      birthTime,
      birthName,
      height,
      complexion,
      bloodGroup,
      education,
      fieldOfStudy,
      job,
      jobLocation,
      annualIncome,

      // ✅ NEW FIELDS
      religion,
      caste,

      profilePhoto: imageUrl,

      fatherName,
      fatherJob,
      motherName,
      motherJob,
      siblings,
      paternalUncleName,
      paternalUncleJob,
      maternalUncleName,
      maternalUncleJob,
    });

    // Compute profile completion percentage
    const computeProfileCompleted = (u) => {
      const fields = [
        "firstName",
        "lastName",
        "email",
        "profilePhoto",
        "gender",
        "dateOfBirth",
        "birthTime",
        "birthName",
        "height",
        "complexion",
        "bloodGroup",
        "education",
        "fieldOfStudy",
        "job",
        "jobLocation",
        "annualIncome",
        "religion",
        "caste",
        "fatherName",
        "motherName",
        "siblings",
      ];

      let filled = 0;
      fields.forEach((f) => {
        const v = u[f];
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          filled += 1;
        }
      });

      return Math.round((filled / fields.length) * 100);
    };

    user.profileCompleted = computeProfileCompleted(user);

    await user.save();

    res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// user login
exports.loginUser = async (req, res) => {
  try {
    const { emailOrPhone, password, captcha } = req.body;

    // ================= CAPTCHA CHECK =================

    if (!req.session || !req.session.captcha) {
      return res.status(400).json({
        message: "Captcha expired. Please refresh.",
      });
    }

    if (
      !captcha ||
      captcha.toLowerCase() !== req.session.captcha.toLowerCase()
    ) {
      return res.status(400).json({
        message: "Invalid captcha",
      });
    }

    // clear captcha after verification
    delete req.session.captcha;

    // ================= FIND USER =================

    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    // ================= CHECK ACCOUNT STATUS =================

    if (!user.isActive) {
      return res.status(403).json({
        message: "Account is disabled",
      });
    }

    // ================= PASSWORD CHECK =================

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid password",
      });
    }

    // ================= CREATE TOKEN =================

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // remove password from response
    const userData = user.toObject();
    delete userData.password;

    res.status(200).json({
      message: "Login successful",
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};
// generate captcha
exports.generateCaptcha = (req, res) => {
  try {
    const captcha = svgCaptcha.create({
      size: 6,
      noise: 2,
      color: true,
      background: "#f2f2f2",
    });

    // store captcha text in session
    req.session.captcha = captcha.text;

    res.type("svg");
    res.status(200).send(captcha.data);
  } catch (error) {
    console.error("Captcha Error:", error);

    res.status(500).json({
      message: "Captcha generation failed",
    });
  }
};

const OTP_EXPIRY = 5 * 60 * 1000;
const RESEND_COOLDOWN = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

exports.sendOTP = async (req, res) => {
  try {
    let { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone is required" });
    }

    // ✅ Normalize phone
    phone = phone.replace(/\s+/g, "");
    const formattedPhone = phone.startsWith("+91") ? phone : `+91${phone}`;

    const user = await User.findOne({ phone: formattedPhone });

    // ✅ Avoid enumeration
    if (!user) {
      return res.json({ message: "If user exists, OTP sent" });
    }

    const now = Date.now();

    // ✅ Cooldown
    if (user.otpRequestedAt && now - user.otpRequestedAt < RESEND_COOLDOWN) {
      return res.status(429).json({
        message: "Please wait before requesting another OTP",
      });
    }

    // ✅ Attempt limit
    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        message: "Too many OTP requests. Try again later.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedOTP = await bcrypt.hash(otp, 10);

    user.otp = hashedOTP;
    user.otpExpiry = now + OTP_EXPIRY;
    user.otpRequestedAt = now;
    user.otpAttempts = (user.otpAttempts || 0) + 1;

    await user.save();

    const message = `Your OTP is ${otp}`;

    const smsResponse = await sendSMS(formattedPhone, message);

    if (!smsResponse.success) {
      return res.status(500).json({
        message: "OTP generated but SMS failed",
      });
    }

    return res.json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(500).json({
      message: "Failed to send OTP",
    });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    let { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP required" });
    }

    // ✅ Normalize phone
    phone = phone.replace(/\s+/g, "");
    const formattedPhone = phone.startsWith("+91") ? phone : `+91${phone}`;

    const user = await User.findOne({ phone: formattedPhone });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Check expiry first
    if (!user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // ✅ Compare hashed OTP
    const isValidOTP = await bcrypt.compare(otp, user.otp);

    if (!isValidOTP) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // ✅ Success
    user.isPhoneVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.json({
      message: "OTP verified successfully",
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "OTP verification failed",
    });
  }
};
