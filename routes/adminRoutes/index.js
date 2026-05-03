const express = require("express");
const router = express.Router();

const dashboardRoutes = require("./dashboardRoutes");
const paymentRoutes = require("./paymentRoutes");
const userRoutes = require("./userRoutes");
const reportRoutes = require("./reportRoutes");
const adminRoutes = require("./adminRoutes");
const notificationRoutes = require("./notificationRoutes");
const intrestRoutes = require("./interestRoutes");
const successStoryRoutes = require("./successStoryRoutes");
const ticketRoutes = require("./ticketRoutes");
const religionRoutes = require("./religionRoutes");
const educationRoutes = require("./educationRoutes");
const pagesRoutes = require("./pagesRoutes");
const settingsRoutes = require("./settingsRoutes");

// Mount routes
router.use("/", adminRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/payments", paymentRoutes);
router.use("/users-admin", userRoutes);
router.use("/reports", reportRoutes);
router.use("/notifications", notificationRoutes);
router.use("/interests", intrestRoutes);
router.use("/success-stories", successStoryRoutes);
router.use("/tickets", ticketRoutes);
router.use("/religions", religionRoutes);
router.use('/educations', educationRoutes);
router.use('/pages', pagesRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;




