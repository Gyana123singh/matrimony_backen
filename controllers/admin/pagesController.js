const Page = require('../../models/Page');

// GET /admin/pages/about
exports.getAbout = async (req, res) => {
  try {
    let page = await Page.findOne({ slug: 'about' });
    if (!page) {
      // return empty content if not created yet
      return res.json({ success: true, data: { slug: 'about', content: '' } });
    }
    res.json({ success: true, data: page });
  } catch (err) {
    console.error('Get about page error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /admin/pages/about
exports.updateAbout = async (req, res) => {
  try {
    const { content, title } = req.body;
    let page = await Page.findOne({ slug: 'about' });
    if (!page) {
      page = await Page.create({ slug: 'about', title: title || 'About', content: content || '' });
    } else {
      if (title !== undefined) page.title = title;
      if (content !== undefined) page.content = content;
      page.updatedAt = Date.now();
      await page.save();
    }
    res.json({ success: true, data: page });
  } catch (err) {
    console.error('Update about page error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
