const express = require("express");
const router = express.Router();

const {
  getAllPayments,
  getPaymentDetails,
  markPaymentCompleted,
  refundPayment,
  createPackage,
  getAllPackages,
  updatePackage,
  deletePackage,
  getPaymentStats,
  getActivePackages,
  buyPackage,
  getRenewals,
  togglePackageStatus,
} = require("../../controllers/admin/paymentController");

const { protect } = require("../../middleware/auth.middleware");
const { isAdmin } = require("../../middleware/role.middleware");

// All routes require authentication and admin role
router.use(protect);
router.use(isAdmin);

// Payment routes
router.get("/payments", getAllPayments);
router.get("/payments/:paymentId", getPaymentDetails);
router.post("/payments/:paymentId/complete", markPaymentCompleted);
router.post("/payments/:paymentId/refund", refundPayment);
router.get("/payments/stats", getPaymentStats);

// Package routes
router.post("/packages", createPackage);
router.get("/packages", getAllPackages);
router.put("/packages/:packageId", updatePackage);
router.delete("/packages/:packageId", deletePackage);
router.get("/packages/active", getActivePackages);
router.post("/packages/buy", buyPackage);
router.get("/packages/renewals", getRenewals);
router.post("/packages/:packageId/toggle", togglePackageStatus);


module.exports = router;
