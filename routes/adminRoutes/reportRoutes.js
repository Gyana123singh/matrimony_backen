const express = require("express");
const router = express.Router();

const {
  getAllReports,
  getReportDetails,
  resolveReport,
  dismissReport,
  getAllTickets,
  getTicketDetails,
  assignTicket,
  addReply,
  closeTicket,
  getTicketStats,
} = require("../../controllers/admin/reportController");

const { protect } = require("../../middleware/auth.middleware");
const { isAdmin } = require("../../middleware/role.middleware");

// All routes require authentication and admin role
router.use(protect);
router.use(isAdmin);

// Report routes
router.get("/reports", getAllReports);
router.get("/reports/:reportId", getReportDetails);
router.put("/reports/:reportId/resolve", resolveReport);
router.put("/reports/:reportId/dismiss", dismissReport);

// Ticket routes
router.get("/tickets", getAllTickets);
router.get("/tickets/:ticketId", getTicketDetails);
router.post("/tickets/:ticketId/assign", assignTicket);
router.post("/tickets/:ticketId/reply", addReply);
router.put("/tickets/:ticketId/close", closeTicket);
router.get("/tickets/stats", getTicketStats);

module.exports = router;
