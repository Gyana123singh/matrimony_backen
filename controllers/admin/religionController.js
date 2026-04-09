const Religion = require('../../models/Religion');

exports.list = async (req, res) => {
  try {
    const list = await Religion.find().sort({ name: 1 });
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('List religions error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const exists = await Religion.findOne({ name });
    if (exists) return res.status(400).json({ success: false, message: 'Already exists' });
    const r = await Religion.create({ name });
    res.status(201).json({ success: true, data: r });
  } catch (err) {
    console.error('Create religion error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await Religion.findByIdAndDelete(id);
    if (!r) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Remove religion error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
