const express = require("express");
const router = express.Router();

const { adminLogin } = require("../../controllers/admin/adminAuthController");
const dashboardRoutes = require("./dashboardRoutes");
const userRoutes = require("./userRoutes");
const paymentRoutes = require("./paymentRoutes");
const reportRoutes = require("./reportRoutes");

const { protect } = require("../../middleware/auth.middleware");
const { isAdmin } = require("../../middleware/role.middleware");

// Public routes
router.post("/login", adminLogin);

// Protected routes
router.use(protect);
router.use(isAdmin);

router.use("/dashboard", dashboardRoutes);
router.use("/users", userRoutes);
router.use("/", paymentRoutes);
router.use("/", reportRoutes);

module.exports = router;
