// Run this script manually or via a system cron to expire subscriptions
require('dotenv').config();
const connectDB = require('../config/dbConnection');
const User = require('../models/User');

(async () => {
  try {
    await connectDB();
    const now = new Date();
    const result = await User.updateMany(
      { subscriptionStatus: 'active', subscriptionEndDate: { $lt: now } },
      { $set: { subscriptionStatus: 'expired' } }
    );
    console.log('Expired subscriptions updated:', result.modifiedCount);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
