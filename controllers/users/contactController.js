const sendEmail = require("../../util/sendEmail");

// POST /api/users/contact
const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email and message are required" });
    }

    // Build email content
    const to = process.env.CONTACT_RECEIVER || process.env.EMAIL_USER;
    const mailSubject = subject || `Contact form submission from ${name}`;
    const text = `You have a new contact form submission:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject || "-"}\n\nMessage:\n${message}`;

    await sendEmail(to, mailSubject, text);

    return res.json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Contact submit error:", error);
    return res.status(500).json({ message: "Failed to send message" });
  }
};

module.exports = { submitContact };
