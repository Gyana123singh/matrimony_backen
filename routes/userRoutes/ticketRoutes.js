const express = require("express");
const router = express.Router();

const {
  createTicket,
  getTickets,
  getTicketDetails,
  addReply,
  closeTicket,
} = require("../../controllers/users/ticketController");

const { protect } = require("../../middleware/auth.middleware");

// All routes require authentication
router.use(protect);

router.post("/", createTicket);
router.get("/", getTickets);
router.get("/:ticketId", getTicketDetails);
router.post("/:ticketId/reply", addReply);
router.put("/:ticketId/close", closeTicket);

module.exports = router;
