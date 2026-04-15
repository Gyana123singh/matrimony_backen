const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const profileRoutes = require("./profileRoutes");
const searchRoutes = require("./searchRoutes");
const interestRoutes = require("./interestRoutes");
const messageRoutes = require("./messageRoutes");
const notificationRoutes = require("./notificationRoutes");
const contactRoutes = require("./contactRoutes");
const shortlistRoutes = require("./shortlistRoutes");
const paymentRoutes = require("./paymentRoutes");
const ticketRoutes = require("./ticketRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const settingsRoutes = require("./settingsRoutes");
const religionRoutes = require("./religionRoutes");
const photoRoutes = require("./photoRoutes");
const successStoryRoutes = require("./successStoryRoutes");
// Mount routes
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/search", searchRoutes);
router.use("/interests", interestRoutes);
router.use("/messages", messageRoutes);
router.use("/notifications", notificationRoutes);
router.use("/contact", contactRoutes);
router.use("/shortlist", shortlistRoutes);
router.use("/payments", paymentRoutes);
router.use("/tickets", ticketRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/settings", settingsRoutes);
router.use('/religions', religionRoutes);
router.use('/photos', photoRoutes);
router.use('/success-stories', successStoryRoutes);

module.exports = router;
