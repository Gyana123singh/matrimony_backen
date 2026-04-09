const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/role.middleware');
const { listSettings, updateSettings } = require('../../controllers/admin/settingsController');

router.use(protect, isAdmin);

router.get('/', listSettings);
router.put('/', updateSettings);

module.exports = router;
