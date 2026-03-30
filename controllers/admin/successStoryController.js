const SuccessStory = require("../../models/SuccessStory");
const cloudinary = require("../../middleware/multerUpload");

// ================= CREATE =================
exports.createStory = async (req, res) => {
  try {
    const { brideName, groomName, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    // Upload to cloudinary
    const result = await cloudinary.uploader.upload_stream(
      { folder: "success_stories" },
      async (error, result) => {
        if (error) {
          return res.status(500).json({ message: "Upload error" });
        }

        const story = await SuccessStory.create({
          brideName,
          groomName,
          description,
          image: result.secure_url,
        });

        res.status(201).json(story);
      }
    );

    result.end(req.file.buffer);

  } catch (error) {
    res.status(500).json({ message: "Create story error" });
  }
};

// ================= GET ALL =================
exports.getStories = async (req, res) => {
  try {
    const stories = await SuccessStory.find().sort({ createdAt: -1 });
    res.json(stories);
  } catch (error) {
    res.status(500).json({ message: "Fetch error" });
  }
};

// ================= UPDATE =================
exports.updateStory = async (req, res) => {
  try {
    const { id } = req.params;
    const { brideName, groomName, description } = req.body;

    let updateData = { brideName, groomName, description };

    // If new image uploaded
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "success_stories" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      updateData.image = result.secure_url;
    }

    const updated = await SuccessStory.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Update error" });
  }
};

// ================= DELETE =================
exports.deleteStory = async (req, res) => {
  try {
    const { id } = req.params;

    await SuccessStory.findByIdAndDelete(id);

    res.json({ message: "Story deleted" });
  } catch (error) {
    res.status(500).json({ message: "Delete error" });
  }
};