const User = require("../../models/User");
const sendEmail = require("../../util/sendEmail");

exports.sendNotification = async (req, res) => {
  try {
    const {
      sentTo,
      message,
      startFrom = 0,
      perBatch = 500,
      coolingPeriod = 5,
    } = req.body;

    let query = {};

    // 🎯 Filter users
    if (sentTo === "KYC Unverified User") {
      query.kycVerified = false;
    } else if (sentTo === "KYC Verified User") {
      query.kycVerified = true;
    }

    const users = await User.find(query)
      .skip(Number(startFrom))
      .limit(Number(perBatch));

    let sentCount = 0;

    for (let user of users) {
      if (user.email) {
        await sendEmail(user.email, "Notification", message);
        sentCount++;

        // cooling delay
        await new Promise((resolve) =>
          setTimeout(resolve, coolingPeriod * 1000)
        );
      }
    }

    res.status(200).json({
      message: "Notifications sent successfully",
      sentCount,
    });
  } catch (error) {
    console.error("Notification error:", error);
    res.status(500).json({ message: "Failed to send notifications" });
  }
};