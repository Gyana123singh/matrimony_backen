const express = require("express");
const router = express.Router();
const upload = require("../../middleware/multerUpload");
const { protect } = require("../../middleware/auth.middleware");
const photoController = require("../../controllers/users/photoController");

// Upload multiple photos (field name: photos)
router.post(
  "/upload",
  protect,
  upload.array("photos", 8),
  photoController.uploadPhotos
);

// Get user's photos
router.get("/", protect, photoController.getPhotos);

// Set profile photo
router.put("/:id/profile", protect, photoController.setProfile);

// Update privacy
router.put("/:id/privacy", protect, photoController.updatePrivacy);

// Delete photo
router.delete("/:id", protect, photoController.deletePhoto);

// Reorder photos
router.put("/reorder", protect, photoController.reorderPhotos);

module.exports = router;
