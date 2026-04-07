const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/auth.middleware");
const { isAdmin } = require("../../middleware/role.middleware");
const ticketController = require("../../controllers/users/ticketController");

// All admin ticket routes are protected + admin role
router.use(protect, isAdmin);

// GET /api/admin/tickets?status=&page=&limit=&q=
router.get("/", ticketController.getAllTickets);

// GET /api/admin/tickets/:id
router.get("/:id", ticketController.getTicketDetails);

// POST /api/admin/tickets/:id/reply
router.post("/:id/reply", ticketController.replyTicket);

// POST /api/admin/tickets/:id/assign
router.post("/:id/assign", ticketController.assignTicket);

// PUT /api/admin/tickets/:id/close
router.put("/:id/close", ticketController.closeTicket);

// Optional: stats
router.get("/stats", ticketController.getTicketStats);

module.exports = router;
