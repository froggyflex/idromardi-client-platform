const nodemailer = require('nodemailer');
require('./env');

const transporterConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
};

if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporterConfig.auth = {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  };
}

const transporter = nodemailer.createTransport(transporterConfig);

module.exports = transporter;
