const transporter = require('../config/email');

async function sendEmail(to, subject, html) {
  const from = process.env.EMAIL_FROM || 'info@idromardi.it';

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });

  return info;
}

module.exports = { sendEmail };
