const express = require("express");
const router = express.Router();

const {
  searchProfiles,
  publicSearchProfiles,
  getMatches,
  viewProfile,
  getVisitors,
  blockUser,
  unblockUser,
  getBlockedUsers,
} = require("../../controllers/users/searchController");

const { protect } = require("../../middleware/auth.middleware");
const checkSubscription = require("../../middleware/checkSubscription");


// Public search (no auth) - /api/users/search/public
router.get("/public", publicSearchProfiles);

// All routes protected
router.use(protect);

// ✅ FIXED ROUTES (IMPORTANT)
router.get("/", searchProfiles); // /api/users/search
router.get("/matches", getMatches); // /api/users/search/matches
// Allow viewing a profile (basic info). Contact details require unlocking.
router.get("/profile/:profileId", viewProfile);
// Unlock contact details (consumes remainingViews) - requires active subscription
router.post("/profile/:profileId/unlock", checkSubscription, async (req, res, next) => {
  // Lazy-load controller to avoid circular requires
  try {
    const controller = require("../../controllers/users/searchController");
    return controller.unlockContact(req, res, next);
  } catch (err) {
    next(err);
  }
});
router.get("/visitors", getVisitors);
router.post("/block", blockUser);
router.post("/unblock", unblockUser);
router.get("/blocked-users", getBlockedUsers);

module.exports = router;
