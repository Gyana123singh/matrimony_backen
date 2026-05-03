const Education = require('../../models/Education');

exports.list = async (req, res) => {
  try {
    const list = await Education.find().sort({ name: 1 });
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('List educations error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const exists = await Education.findOne({ name });
    if (exists) return res.status(400).json({ success: false, message: 'Already exists' });
    const e = await Education.create({ name });
    res.status(201).json({ success: true, data: e });
  } catch (err) {
    console.error('Create education error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const e = await Education.findByIdAndDelete(id);
    if (!e) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Remove education error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
