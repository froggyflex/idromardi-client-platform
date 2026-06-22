const transporter = require('../config/email');

async function sendEmail(to, subject, html) {
  const from = process.env.EMAIL_FROM || 'info@idromardi.it';

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    return info;
  } catch (error) {
    if (error.code === 'EAUTH' || String(error.response || '').includes('535')) {
      throw Object.assign(new Error('SMTP authentication rejected.'), {
        statusCode: 502,
        publicMessage: 'Servizio email non disponibile. Controlla le credenziali SMTP.',
      });
    }

    throw error;
  }
}

module.exports = { sendEmail };
