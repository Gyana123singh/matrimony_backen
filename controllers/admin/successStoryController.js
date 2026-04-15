const SuccessStory = require("../../models/SuccessStory");

// Note: images are uploaded by multer-storage-cloudinary configured in middleware/multerUpload
// multer will store the uploaded file to Cloudinary and attach file info on `req.file`.

// ================= CREATE =================
exports.createStory = async (req, res) => {
  try {
    const { brideName, groomName, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    // multer-storage-cloudinary attaches uploaded file info on req.file
    const imageUrl = req.file.path || req.file.location || req.file.url || req.file.secure_url;

    const story = await SuccessStory.create({
      brideName,
      groomName,
      description,
      image: imageUrl,
    });

    res.status(201).json(story);

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

    // If new image uploaded, use the URL provided by multer/cloudinary
    if (req.file) {
      const imageUrl = req.file.path || req.file.location || req.file.url || req.file.secure_url;
      if (imageUrl) updateData.image = imageUrl;
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