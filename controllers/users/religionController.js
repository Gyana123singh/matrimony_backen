const Religion = require('../../models/Religion');

exports.list = async (req, res) => {
  try {
    const list = await Religion.find().sort({ name: 1 });
    res.json({ success: true, data: list.map((r) => r.name) });
  } catch (err) {
    console.error('User list religions error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
