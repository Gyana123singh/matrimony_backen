const express = require("express");
const router = express.Router();
const { submitContact } = require("../../controllers/users/contactController");

// POST /api/users/contact
router.post("/", submitContact);

module.exports = router;
