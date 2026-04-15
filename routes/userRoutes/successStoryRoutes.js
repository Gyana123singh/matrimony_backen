const express = require("express");
const router = express.Router();

const {
  getStories,
} = require("../../controllers/users/successStoryController");

// Public: list success stories
router.get("/", getStories);

module.exports = router;
