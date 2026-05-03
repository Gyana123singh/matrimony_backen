const express = require("express");
const router = express.Router();
const {
  getSettings,
  updateAllSettings,
  changePassword,
  deleteAccount,
  getAbout,
} = require("../../controllers/users/settingsController");

const { protect } = require("../../middleware/auth.middleware");

router.get("/", protect, getSettings);
router.put("/", protect, updateAllSettings);
router.put("/change-password", protect, changePassword);
router.delete("/delete", protect, deleteAccount);
router.get("/about", getAbout);

module.exports = router;
