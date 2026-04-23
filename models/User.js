const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // ================= BASIC INFO =================

    fullName: {
      type: String,
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
    resetPasswordToken: String,
    resetPasswordExpires: Date,
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
    likedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // ================= PERSONAL INFO =================
    maritalStatus: {
      type: String,
      enum: ["single", "divorced", "widowed"],
      default: "single",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },
    height: String,

    complexion: String,

    bloodGroup: String,

    // maritalStatus already defined earlier with enum; remove duplicate

    education: String,
    fieldOfStudy: String,
    educationCategory: String,
    educationDetails: String,
    college: String,
    // Extended personal fields
    rashi: { type: String, trim: true },
    weight: Number,
    motherTongue: { type: String, trim: true },
    bodyType: {
      type: String,
      enum: ["Slim", "Average", "Athletic", "Heavy"],
    },

    occupationDetails: String,
    employedIn: String,

    job: String,

    jobLocation: String,

    // Job location extended
    jobCountry: String,
    jobState: String,
    jobCity: String,
    jobLocationDetails: String,

    // Personal location
    country: String,
    citizenship: String,
    state: String,
    city: String,
    nativePlace: String,

    annualIncome: String,

    about: String,

    hobbies: [String],

    // Categorized interests
    music: String,
    reading: String,
    moviesAndTVShows: String,
    sportsAndFitness: String,
    food: String,

    // Lifestyle and contact display
    lifestyle: String,
    contactDisplay: String, // e.g., 'public', 'onlyPremium', 'private'
    // Additional personal details
    presentAddress: String,
    languages: [String],
    // Also store comma-separated languages when provided from legacy clients
    languagesString: { type: String, trim: true },
    smoking: {
      type: String,
      enum: ["non-smoker", "occasional", "smoker"],
    },
    drinking: {
      type: String,
      enum: ["non-drinker", "occasional", "drinker"],
    },

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

    // Extended family details
    familyValues: String,
    familyStatus: String,
    ancestralOrigin: String,
    brothers: { type: Number, default: 0 },
    brothersMarried: { type: Number, default: 0 },
    sisters: { type: Number, default: 0 },
    sistersMarried: { type: Number, default: 0 },

    // ================= MEDIA =================

    profilePhoto: String,

    photos: [
      {
        url: { type: String, required: true },
        public_id: { type: String },
        isProfile: { type: Boolean, default: false },
        privacy: {
          type: String,
          enum: ["public", "protected", "private"],
          default: "public",
        },
        order: { type: Number, default: 0 },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Primary images array (stores uploaded image URLs)
    images: [String],

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
    remainingViews: { type: Number, default: 0 },
    remainingInterests: { type: Number, default: 0 },
    remainingUploads: { type: Number, default: 0 },
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
    subscriptionFeatures: {
      contactViews: { type: Number, default: 0 },
      interestExpress: { type: Number, default: 0 },
      imageUploads: { type: Number, default: 0 },
    },
    subscriptionBenefits: [{ type: String }],
    paymentMethod: String,

    lastPaymentDate: Date,

    totalSpent: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
