const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/role.middleware');
const { getAbout, updateAbout } = require('../../controllers/admin/pagesController');

// protect admin routes
router.use(protect, isAdmin);

router.get('/about', getAbout);
router.put('/about', updateAbout);

module.exports = router;
