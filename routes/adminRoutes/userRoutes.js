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
} = require("../../controllers/admin/userController");

const { protect } = require("../../middleware/auth.middleware");
const { isAdmin } = require("../../middleware/role.middleware");

// All routes require authentication and admin role
router.use(protect);
router.use(isAdmin);

router.get("/", getAllUsers);
router.get("/:userId", getUserDetails);
router.post("/:userId/ban", banUser);
router.post("/:userId/unban", unbanUser);
router.post("/:userId/deactivate", deactivateUser);
router.post("/:userId/activate", activateUser);
router.post("/:userId/verify-email", verifyEmail);
router.post("/:userId/verify-phone", verifyPhone);
router.post("/:userId/verify-kyc", verifyKYC);
router.put("/:userId/notes", addNotes);
router.delete("/:userId", deleteUser);

module.exports = router;
