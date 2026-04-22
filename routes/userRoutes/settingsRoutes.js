const express = require("express");
const router = express.Router();
const {
  getSettings,
  updateAllSettings,
  changePassword,
  deleteAccount,
} = require("../../controllers/users/settingsController");

const { protect } = require("../../middleware/auth.middleware");

router.use(protect);

router.get("/", getSettings);
router.put("/", updateAllSettings);
router.put("/change-password", changePassword);
router.delete("/delete", deleteAccount);

module.exports = router;
