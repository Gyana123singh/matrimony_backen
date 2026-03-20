const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} = require("../../controllers/users/notificationController");

const { protect } = require("../../middleware/auth.middleware");

// All routes require authentication
router.use(protect);

router.get("/", getNotifications);
router.put("/:notificationId/read", markAsRead);
router.put("/read-all", markAllAsRead);
router.delete("/:notificationId", deleteNotification);
router.get("/unread/count", getUnreadCount);

module.exports = router;
