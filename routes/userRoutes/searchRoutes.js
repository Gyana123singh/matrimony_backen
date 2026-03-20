const express = require("express");
const router = express.Router();

const {
  searchProfiles,
  getMatches,
  viewProfile,
  getVisitors,
  blockUser,
  unblockUser,
  getBlockedUsers,
} = require("../../controllers/users/searchController");

const { protect } = require("../../middleware/auth.middleware");

// All routes protected
router.use(protect);

// ✅ FIXED ROUTES (IMPORTANT)
router.get("/", searchProfiles); // /api/users/search
router.get("/matches", getMatches); // /api/users/search/matches
router.get("/profile/:profileId", viewProfile);
router.get("/visitors", getVisitors);
router.post("/block", blockUser);
router.post("/unblock", unblockUser);
router.get("/blocked-users", getBlockedUsers);

module.exports = router;
