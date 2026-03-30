const express = require("express");
const router = express.Router();

const upload = require("../../middleware/multerUpload");

const {
  createStory,
  getStories,
  updateStory,
  deleteStory,
} = require("../../controllers/admin/successStoryController");

// CREATE
router.post("/", upload.single("image"), createStory);

// GET
router.get("/", getStories);

// UPDATE
router.put("/:id", upload.single("image"), updateStory);

// DELETE
router.delete("/:id", deleteStory);

module.exports = router;