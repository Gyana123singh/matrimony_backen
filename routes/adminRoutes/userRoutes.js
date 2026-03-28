const express = require("express");
const router = express.Router();

const {
  getAllUsers,
  getUserDetails,
  banUser,
  unbanUser,
  deactivateUser,
  activateUser,
  verifyEmail,
  verifyPhone,
  verifyKYC,
  addNotes,
  deleteUser,
  updateUserDetails,      // ✅ ADD
  toggleVerification,     // ✅ ADD
} = require("../../controllers/admin/userController");

const { protect } = require("../../middleware/auth.middleware");
const { isAdmin } = require("../../middleware/role.middleware");

// All routes require authentication and admin role
router.use(protect);
router.use(isAdmin);

// ================= USERS =================
router.get("/", getAllUsers);
router.get("/:userId", getUserDetails);

// ================= UPDATE =================
router.put("/:userId", updateUserDetails);        // ✅ NEW

// ================= ADMIN ACTIONS =================
router.post("/:userId/ban", banUser);
router.post("/:userId/unban", unbanUser);
router.post("/:userId/deactivate", deactivateUser);
router.post("/:userId/activate", activateUser);

// ================= VERIFICATION =================
router.post("/:userId/verify-email", verifyEmail);
router.post("/:userId/verify-phone", verifyPhone);
router.post("/:userId/verify-kyc", verifyKYC);

// 🔥 Dynamic toggle (better for UI switches)
router.patch("/:userId/toggle", toggleVerification); // ✅ NEW

// ================= NOTES =================
router.put("/:userId/notes", addNotes);

// ================= DELETE =================
router.delete("/:userId", deleteUser);

module.exports = router;