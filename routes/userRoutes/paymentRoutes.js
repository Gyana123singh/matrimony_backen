const express = require("express");
const router = express.Router();

const {
  getPackages,
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory,
  getCurrentSubscription,
  cancelSubscription,
  getAllPackages,
} = require("../../controllers/users/paymentController");

const { protect } = require("../../middleware/auth.middleware");

// Get packages route (public)
router.get("/packages", getPackages);

router.post("/create-intent", protect, createPaymentIntent);
router.post("/confirm", protect, confirmPayment);
router.get("/history", protect, getPaymentHistory);
router.get("/subscription", protect, getCurrentSubscription);
router.post("/subscription/cancel", protect, cancelSubscription);

module.exports = router;
