const express = require('express');
const router = express.Router();
const { list } = require('../../controllers/users/educationController');

// Public route to fetch educations
router.get('/', list);

module.exports = router;
