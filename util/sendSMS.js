// utils/sendSMS.js
const axios = require("axios");

const sendSMS = async (mobile, message) => {
  try {
    const response = await axios.get(
      "http://trsms.dolphinunisys.com/submitsms.jsp",
      {
        params: {
          user: "dolphin",
          key: process.env.SMS_API_KEY,
          mobile,
          message,
          senderid: "LRSVSL",
          accusage: "1",
          entityid: process.env.DLT_ENTITY_ID,
          tempid: process.env.DLT_TEMPLATE_ID,
        },
      },
    );

    const data = response.data?.toString().toLowerCase();

    if (data && data.includes("success")) {
      return { success: true };
    }

    return { success: false, response: response.data };
  } catch (error) {
    console.error("SMS Error:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = sendSMS;
