const express = require("express");
const router = express.Router();

const upload = require("../../middleware/multerUpload");
const { protect } = require("../../middleware/auth.middleware");
const { isAdmin } = require("../../middleware/role.middleware");

const {
  createStory,
  getStories,
  updateStory,
  deleteStory,
} = require("../../controllers/admin/successStoryController");

// Protect all success story admin routes
router.use(protect);
router.use(isAdmin);

// CREATE
router.post("/", upload.single("image"), createStory);

// GET
router.get("/", getStories);

// UPDATE
router.put("/:id", upload.single("image"), updateStory);

// DELETE
router.delete("/:id", deleteStory);

module.exports = router;