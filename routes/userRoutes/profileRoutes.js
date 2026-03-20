const express = require("express");
const router = express.Router();

const {
  getUserProfile,
  updateUserProfile,
  updateFamilyInfo,
  updatePreferences,
  addPhotos,
  deletePhoto,
  changePassword,
  getNotificationPreferences,
  updateNotificationPreferences,
  getUserDashboard,
  getVisitorsPage,
  trackProfileVisit,
} = require("../../controllers/users/profileController");

const { protect } = require("../../middleware/auth.middleware");

// All routes require authentication
router.use(protect);

router.get("/", getUserProfile);
router.put("/", updateUserProfile);
router.put("/family", updateFamilyInfo);
router.put("/preferences", updatePreferences);
router.post("/photos", addPhotos);
router.delete("/photos/:photoId", deletePhoto);
router.post("/change-password", changePassword);
router.get("/notifications/preferences", getNotificationPreferences);
router.put("/notifications/preferences", updateNotificationPreferences);
router.get("/get-dashboard", getUserDashboard);
router.get("/visitors", getVisitorsPage);
router.post("/visit/:profileId", trackProfileVisit);

module.exports = router;
