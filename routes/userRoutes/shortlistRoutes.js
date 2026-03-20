const express = require("express");
const router = express.Router();

const {
  addToShortlist,
  removeFromShortlist,
  getShortlist,
  ignoreProfile,
  reportUser,
} = require("../../controllers/users/shortlistController");

const { protect } = require("../../middleware/auth.middleware");

// All routes require authentication
router.use(protect);

router.post("/add", addToShortlist);
router.post("/remove", removeFromShortlist);
router.get("/", getShortlist);
router.post("/ignore", ignoreProfile);
router.post("/report", reportUser);

module.exports = router;
