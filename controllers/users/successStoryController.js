const SuccessStory = require("../../models/SuccessStory");

// GET PUBLIC STORIES
exports.getStories = async (req, res) => {
  try {
    const stories = await SuccessStory.find().sort({ createdAt: -1 });

    res.status(200).json(stories);
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ message: "Fetch error" });
  }
};
