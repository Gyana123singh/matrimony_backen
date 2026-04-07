const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const svgCaptcha = require("svg-captcha");
const jwt = require("jsonwebtoken");
const sendSMS = require("../../util/sendSMS");

// ✅ HELPER FUNCTION (AGE CALCULATION)
const calculateAge = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

// ================= REGISTER USER =================
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
      state,
      city,
      presentAddress,
      languages,
      smoking,
      drinking,
    } = req.body;
    const { maritalStatus } = req.body;

    // ✅ DOB REQUIRED CHECK
    if (!dateOfBirth) {
      return res.status(400).json({
        message: "Date of birth is required",
      });
    }

    // ✅ AGE VALIDATION (BLOCK <18)
    const age = calculateAge(dateOfBirth);
    if (age < 18) {
      return res.status(400).json({
        message: "You must be at least 18 years old to register",
      });
    }

    // ✅ CHECK EXISTING USER
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    // ✅ HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ CLOUDINARY IMAGE
    let imageUrl = "";
    if (req.file) {
      imageUrl = req.file.path;
    }

    // Normalize languages: allow comma-separated string
    let languagesArr = [];
    if (languages) {
      if (Array.isArray(languages)) languagesArr = languages;
      else if (typeof languages === "string")
        languagesArr = languages.split(",").map((s) => s.trim()).filter(Boolean);
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
      maritalStatus,
      state,
      city,
      presentAddress,
      languages: languagesArr,
      smoking,
      drinking,
    });

    // ✅ PROFILE COMPLETION LOGIC
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
        "state",
        "city",
        "annualIncome",
        "religion",
        "caste",
        "fatherName",
        "motherName",
        "siblings",
        "about",
        "hobbies",
        "presentAddress",
        "languages",
        "smoking",
        "drinking",
        "phone",
        "lifestyle",
      ];

      let filled = 0;
      fields.forEach((f) => {
        const v = u[f];
        if (f === "languages") {
          if (Array.isArray(v) && v.length > 0) filled += 1;
        } else if (v !== undefined && v !== null && String(v).trim() !== "") {
          filled += 1;
        }
      });

      return Math.round((filled / fields.length) * 100);
    };

    user.profileCompleted = computeProfileCompleted(user);

    await user.save();

    // Emit dashboard update for admins (new user registered)
    try {
      const io = req.app.get("io");
      if (io) {
        io.to("admin:all").emit("dashboard:graphUpdated", {
          type: "user:registered",
          user: { _id: user._id, createdAt: user.createdAt },
        });
      }
    } catch (e) {
      console.warn("Failed to emit dashboard update on user register:", e);
    }

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

// ================= LOGIN USER =================
exports.loginUser = async (req, res) => {
  try {
    const { emailOrPhone, password, captcha } = req.body;

    // ================= CAPTCHA =================
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

    // ================= AGE CHECK =================
    const age = calculateAge(user.dateOfBirth);
    if (age < 18) {
      return res.status(403).json({
        message: "You must be at least 18 years old to access this platform",
      });
    }

    // ================= ACCOUNT STATUS =================
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

    // ✅ ================= SET ONLINE =================
    user.isOnline = true;
    user.lastSeen = new Date();
    user.lastLogin = new Date();

    await user.save();

    // ================= TOKEN =================
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

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
// ================= LOGOUT USER =================
exports.logoutUser = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await User.findByIdAndUpdate(req.user._id, {
      isOnline: false,
      lastSeen: new Date(),
    });

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout error" });
  }
};