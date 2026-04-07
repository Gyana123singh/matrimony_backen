const express = require("express");
const router = express.Router();

const {
  sendInterest,
  getReceivedInterests,
  getSentInterests,
  acceptInterest,
  rejectInterest,
  cancelInterest,
} = require("../../controllers/users/interestController");

const { protect } = require("../../middleware/auth.middleware");
const checkSubscription = require("../../middleware/checkSubscription");

// All routes require authentication
router.use(protect);

router.post("/send", checkSubscription, sendInterest);
router.get("/received", getReceivedInterests);
router.get("/sent", getSentInterests);
router.put("/:interestId/accept", acceptInterest);
router.put("/:interestId/reject", rejectInterest);
router.delete("/:interestId", cancelInterest);

module.exports = router;
