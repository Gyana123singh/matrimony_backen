const express = require("express");
const router = express.Router();

const {
  sendMessage,
  getMessages,
  getConversations,
  deleteMessage,
  markAsRead,
  editMessage,
} = require("../../controllers/users/messageController");

const upload = require("../../middleware/multerUpload");

const { protect } = require("../../middleware/auth.middleware");

// All routes require authentication
router.use(protect);

// Accept multipart/form-data attachments under field name 'attachments'
router.post("/send", upload.array("attachments", 5), sendMessage);
router.put("/:messageId", editMessage);
router.get("/", getMessages);
router.get("/conversations", getConversations);
router.delete("/:messageId", deleteMessage);
router.put("/:messageId/read", markAsRead);

module.exports = router;
