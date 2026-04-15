const User = require("../../models/User");
const cloudinary = require("../../config/coudinary");

// Upload photos (multipart - handled by multer/cloudinary storage)
exports.uploadPhotos = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const files = req.files || [];
    if (!files.length)
      return res.status(400).json({ message: "No files uploaded" });

    const existingCount = user.photos ? user.photos.length : 0;
    const maxAllowed = 8;
    if (existingCount + files.length > maxAllowed)
      return res
        .status(400)
        .json({ message: `You can upload up to ${maxAllowed} photos` });

    files.forEach((file, idx) => {
      // multer-storage-cloudinary exposes `path` as URL and `filename` as public_id
      const url = file.path || file.location || file.url;
      const public_id = file.filename || file.public_id || null;

      // Prevent exact duplicate URLs
      if (user.photos.find((p) => p.url === url)) return;

      user.photos.push({
        url,
        public_id,
        privacy: req.body.privacy || "public",
        isProfile: user.photos.length === 0 ? true : false, // first uploaded becomes profile if none
        order: user.photos.length,
      });
    });

    // Ensure only one isProfile
    if (user.photos.filter((p) => p.isProfile).length > 1) {
      // keep the last set as profile
      let last = null;
      user.photos.forEach((p) => {
        if (p.isProfile) last = p;
        p.isProfile = false;
      });
      if (last) last.isProfile = true;
      user.profilePhoto = last ? last.url : user.photos[0].url;
    } else if (user.photos.length && !user.profilePhoto) {
      user.profilePhoto = user.photos.find((p) => p.isProfile).url;
    }

    await user.save();

    res.json({ photos: user.photos });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
};

exports.getPhotos = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "photos profilePhoto",
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    const photos = (user.photos || []).sort((a, b) => a.order - b.order);
    res.json({ photos, profilePhoto: user.profilePhoto });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch photos" });
  }
};

exports.setProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    let target = user.photos.id(id);
    if (!target) return res.status(404).json({ message: "Photo not found" });

    user.photos.forEach((p) => (p.isProfile = false));
    target.isProfile = true;
    user.profilePhoto = target.url;
    await user.save();

    res.json({ photos: user.photos, profilePhoto: user.profilePhoto });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to set profile photo" });
  }
};

exports.updatePrivacy = async (req, res) => {
  try {
    const { id } = req.params;
    const { privacy } = req.body;
    if (!["public", "protected", "private"].includes(privacy))
      return res.status(400).json({ message: "Invalid privacy value" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    let target = user.photos.id(id);
    if (!target) return res.status(404).json({ message: "Photo not found" });

    target.privacy = privacy;
    await user.save();

    res.json({ photo: target });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update privacy" });
  }
};

exports.deletePhoto = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const photo = user.photos.id(id);
    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }

    // 🔥 Delete from Cloudinary
    if (photo.public_id) {
      try {
        await cloudinary.uploader.destroy(photo.public_id);
      } catch (err) {
        console.warn("Cloudinary delete failed:", err.message);
      }
    }

    const wasProfile = photo.isProfile;

    // 🔥 Remove photo from array
    photo.deleteOne();

    // 🔥 Fix profile photo if needed
    if (wasProfile) {
      if (user.photos.length > 0) {
        user.photos[0].isProfile = true;
        user.profilePhoto = user.photos[0].url;
      } else {
        user.profilePhoto = null;
      }
    }

    // 🔥 Reorder photos (important)
    user.photos.forEach((p, index) => {
      p.order = index;
    });

    await user.save();

    return res.status(200).json({
      message: "Photo deleted successfully",
      photos: user.photos,
      profilePhoto: user.profilePhoto,
    });
  } catch (error) {
    console.error("Delete photo error:", error);
    res.status(500).json({
      message: "Failed to delete photo",
      error: error.message,
    });
  }
};

exports.reorderPhotos = async (req, res) => {
  try {
    const { order } = req.body; // expected: [photoId1, photoId2, ...]
    if (!Array.isArray(order))
      return res.status(400).json({ message: "Invalid order" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const newPhotos = [];
    order.forEach((pid, idx) => {
      const p = user.photos.id(pid);
      if (p) {
        p.order = idx;
        newPhotos.push(p);
      }
    });

    // For any photos not included in order, append them
    user.photos.forEach((p) => {
      if (!order.includes(p._id.toString())) {
        p.order = newPhotos.length;
        newPhotos.push(p);
      }
    });

    // Replace photos array preserving Mongoose subdocs
    user.photos = newPhotos;
    await user.save();

    res.json({ photos: user.photos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to reorder photos" });
  }
};
