const QRCode = require("qrcode");

exports.generateQR = async (ticketNumber) => {
  return await QRCode.toDataURL(ticketNumber);
};