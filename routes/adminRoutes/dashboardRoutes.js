const express = require("express");
const router = express.Router();

const {
  getDashboardStats,
  getGraphData,
} = require("../../controllers/admin/dashboardController");

const { protect } = require("../../middleware/auth.middleware");
const { isAdmin } = require("../../middleware/role.middleware");

// All routes require authentication and admin role
router.use(protect);
router.use(isAdmin);

router.get("/stats", getDashboardStats);
router.get("/graph-data", getGraphData);

module.exports = router;
