const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/role.middleware');
const { list, create, remove } = require('../../controllers/admin/educationController');

// Protect and restrict to admin
router.use(protect, isAdmin);

router.get('/', list);
router.post('/', create);
router.delete('/:id', remove);

module.exports = router;
