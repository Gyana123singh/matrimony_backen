const express = require("express");
const router = express.Router();

const { sendNotification } = require("../../controllers/admin/notificationController");
const { protect } = require("../../middleware/auth.middleware");
const { isAdmin } = require("../../middleware/role.middleware");

router.use(protect);
router.use(isAdmin);

router.post("/send", sendNotification);

module.exports = router;