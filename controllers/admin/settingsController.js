const Setting = require('../../models/Setting');

// GET /admin/settings
exports.listSettings = async (req, res) => {
  try {
    const list = await Setting.find().sort({ key: 1 });
    const result = {};
    list.forEach((s) => (result[s.key] = s.value));
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('List settings error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /admin/settings - bulk update
exports.updateSettings = async (req, res) => {
  try {
    const updates = req.body || {};
    const keys = Object.keys(updates);
    for (let key of keys) {
      const value = updates[key];
      await Setting.findOneAndUpdate({ key }, { value, updatedAt: Date.now() }, { upsert: true });
    }
    const list = await Setting.find().sort({ key: 1 });
    const result = {};
    list.forEach((s) => (result[s.key] = s.value));
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Update settings error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
