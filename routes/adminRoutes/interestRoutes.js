const express = require("express");
const router = express.Router();

const { getAllInterests, getAllIgnoredProfiles } = require("../../controllers/admin/interestController");

const { protect } = require("../../middleware/auth.middleware");
const { isAdmin } = require("../../middleware/role.middleware");

router.use(protect);
router.use(isAdmin);

// GET all interests
router.get("/", getAllInterests);
router.get("/ignored", getAllIgnoredProfiles);

module.exports = router;