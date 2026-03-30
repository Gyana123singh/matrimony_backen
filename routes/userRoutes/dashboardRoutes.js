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

const { protect } = require("../../middleware/auth.middleware");

router.use(protect);
router.get("/get-profile", getUserProfile);
router.get("/stats", getDashboardStats);
router.get("/recommended", getRecommendedProfiles);
router.get("/new-matches", getNewMatches);
router.get("/interests", getNewInterests);
router.get("/near-matches", getNearMatches);
router.get("/active-users", getActiveUsers);
router.get("/visitors", getVisitors);
router.post("/visit/:profileId", trackVisit);
router.post("/like/:profileId", toggleLike);


module.exports = router;
