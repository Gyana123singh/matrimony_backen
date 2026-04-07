const express = require("express");
const router = express.Router();

const {
  getDashboardStats,
  getRecommendedProfiles,
  getNewMatches,
  getNewInterests,
  getNearMatches,
  getActiveUsers,
  getVisitors,
  trackVisit,
  getUserProfile,
  toggleLike
} = require("../../controllers/users/dashboardController");
const { updateLastSeen } = require("../../middleware/updateLastSeen");

const { protect } = require("../../middleware/auth.middleware");
const checkSubscription = require("../../middleware/checkSubscription");

router.use(protect);
// router.use(updateLastSeen);
router.get("/get-profile", getUserProfile);
router.get("/stats", getDashboardStats);
router.get("/recommended", getRecommendedProfiles);
router.get("/new-matches", getNewMatches);
router.get("/interests", getNewInterests);
router.get("/near-matches", getNearMatches);
router.get("/active-users", getActiveUsers);
router.get("/visitors", getVisitors);
// Keep read-only dashboard endpoints open to all authenticated users (no subscription required)
router.post("/visit/:profileId", checkSubscription, trackVisit);
router.post("/like/:profileId", checkSubscription, toggleLike);


module.exports = router;
