const express = require("express");
const router = express.Router();

const {
  sendMessage,
  getMessages,
  getConversations,
  deleteMessage,
  markAsRead,
} = require("../../controllers/users/messageController");

const { protect } = require("../../middleware/auth.middleware");

// All routes require authentication
router.use(protect);

router.post("/send", sendMessage);
router.get("/", getMessages);
router.get("/conversations", getConversations);
router.delete("/:messageId", deleteMessage);
router.put("/:messageId/read", markAsRead);

module.exports = router;
