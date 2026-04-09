const express = require('express');
const router = express.Router();
const { list } = require('../../controllers/users/religionController');

// Public route to fetch religions
router.get('/', list);

module.exports = router;
