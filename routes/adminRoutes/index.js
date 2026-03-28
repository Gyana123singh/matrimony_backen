const express = require("express");
const router = express.Router();

const dashboardRoutes = require("./dashboardRoutes");
const paymentRoutes = require("./paymentRoutes");
const userRoutes = require("./userRoutes");
const reportRoutes = require("./reportRoutes");
const adminRoutes = require("./adminRoutes");
const notificationRoutes = require("./notificationRoutes");
const intrestRoutes = require("./interestRoutes");

// Mount routes
router.use("/", adminRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/payments", paymentRoutes);
router.use("/users-admin", userRoutes);
router.use("/reports", reportRoutes);
router.use("/notifications", notificationRoutes);
router.use("/interests", intrestRoutes);

module.exports = router;




