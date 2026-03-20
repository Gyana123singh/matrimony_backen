const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // ================= BASIC INFO =================

    firstName: {
      type: String,
      required: true,
    },

    lastName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    phone: String,
    image: String,

    password: {
      type: String,
      required: true,
    },

    gender: {
      type: String,
      enum: ["male", "female"],
    },

    dateOfBirth: Date,

    birthTime: String,

    birthName: String,
    religion: {
      type: String,
    },
    otp: String,
    otpExpiry: Date,
    otpRequestedAt: Date,
    otpAttempts: { type: Number, default: 0 },
    caste: {
      type: String,
    },
    // ================= ROLE & STATUS =================
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    isKycVerified: {
      type: Boolean,
      default: false,
    },

    profileCompleted: {
      type: Number,
      default: 0, // 0-100 percentage
    },

    // ================= PERSONAL INFO =================

    height: String,

    complexion: String,

    bloodGroup: String,

    religion: String,

    caste: String,

    maritalStatus: String,

    education: String,

    job: String,

    jobLocation: String,

    annualIncome: String,

    about: String,

    hobbies: [String],

    // ================= FAMILY INFO =================

    fatherName: String,

    fatherJob: String,

    motherName: String,

    motherJob: String,

    siblings: String,

    paternalUncleName: String,

    paternalUncleJob: String,

    maternalUncleName: String,

    maternalUncleJob: String,

    familyLocation: String,

    familyType: String, // joint, nuclear

    // ================= MEDIA =================

    profilePhoto: String,

    photos: [
      {
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // ================= PREFERENCES =================

    preferredGender: String,

    preferredMinAge: Number,

    preferredMaxAge: Number,

    preferredHeight: String,

    preferredEducation: String,

    preferredReligion: String,

    preferredCaste: String,

    preferredMaritalStatus: String,

    // ================= INTERACTIONS =================

    interests: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        status: {
          type: String,
          enum: ["sent", "received", "accepted", "rejected"],
          default: "sent",
        },
        sentAt: { type: Date, default: Date.now },
      },
    ],

    matches: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", // ✅ ADD THIS
        },
        matchedAt: { type: Date, default: Date.now },
      },
    ],

    shortlist: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", // ✅ MUST ADD
        },
        addedAt: { type: Date, default: Date.now },
      },
    ],

    blockedUsers: [mongoose.Schema.Types.ObjectId],

    ignoredProfiles: [mongoose.Schema.Types.ObjectId],

    // ================= SUBSCRIPTION =================

    subscriptionPlan: String,

    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "expired"],
      default: "inactive",
    },

    subscriptionStartDate: Date,

    subscriptionEndDate: Date,

    subscriptionAmount: Number,

    // ================= VISIT TRACKING =================

    visitedProfiles: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        visitedAt: { type: Date, default: Date.now },
      },
    ],

    visitors: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        visitedAt: { type: Date, default: Date.now },
      },
    ],

    // ================= NOTIFICATIONS =================

    notificationPreferences: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
    },

    // ================= ADMIN FIELDS =================

    isBanned: {
      type: Boolean,
      default: false,
    },

    banReason: String,

    bannedAt: Date,

    notes: String,

    lastLoginAt: Date,

    loginCount: { type: Number, default: 0 },
    privacySettings: {
      hidePhone: { type: Boolean, default: false },
      hidePhotos: { type: Boolean, default: false },
      profileVisibility: {
        type: String,
        enum: ["public", "members", "premium"],
        default: "public",
      },
    },

    notificationSettings: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: true },
      interestAlerts: { type: Boolean, default: true },
      messageAlerts: { type: Boolean, default: true },
      profileViewAlerts: { type: Boolean, default: true },
    },
    // ================= PAYMENT INFO =================

    paymentMethod: String,

    lastPaymentDate: Date,

    totalSpent: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
