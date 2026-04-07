const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/auth.middleware");
const ticketController = require("../../controllers/users/ticketController");

// Create ticket -> POST /api/users/tickets
router.post("/", protect, ticketController.createTicket);

// Get logged-in user's tickets -> GET /api/users/tickets
router.get("/", protect, ticketController.getUserTickets);

// Get ticket details (user can view their own ticket) -> GET /api/users/tickets/:id
router.get("/:id", protect, ticketController.getTicketDetails);

// Reply to ticket (user reply) -> POST /api/users/tickets/:id/reply
router.post("/:id/reply", protect, ticketController.replyTicket);

// Close ticket (user can close their ticket)
router.put("/:id/close", protect, ticketController.closeTicket);

module.exports = router;

