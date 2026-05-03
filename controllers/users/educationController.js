const Education = require('../../models/Education');

exports.list = async (req, res) => {
  try {
    const list = await Education.find().sort({ name: 1 });
    // return array of names for user consumption
    res.json({ success: true, data: list.map((e) => ({ name: e.name })) });
  } catch (err) {
    console.error('User list educations error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
