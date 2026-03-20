const express = require("express");
const router = express.Router();

const {
  getPackages,
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory,
  getCurrentSubscription,
  cancelSubscription,
} = require("../../controllers/users/paymentController");

const { protect } = require("../../middleware/auth.middleware");

// Get packages route (public)
router.get("/packages", getPackages);

// All other routes require authentication
router.use(protect);

router.post("/create-intent", createPaymentIntent);
router.post("/confirm", confirmPayment);
router.get("/history", getPaymentHistory);
router.get("/subscription", getCurrentSubscription);
router.post("/subscription/cancel", cancelSubscription);

module.exports = router;
