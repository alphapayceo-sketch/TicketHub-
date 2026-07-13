const admin = require("../config/firebase");

exports.sendPushNotification = async (
  token,
  title,
  body
) => {

  try {

    await admin.messaging().send({
      token,
      notification: {
        title,
        body
      }
    });

  } catch (error) {

    console.error(
      "Notification Error:",
      error
    );

  }

};