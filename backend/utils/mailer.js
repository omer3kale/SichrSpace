const nodemailer = require('nodemailer');

// Configure transporter (use real SMTP in production, ethereal for dev/testing)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'your_ethereal_user',
    pass: process.env.SMTP_PASS || 'your_ethereal_pass'
  }
});

/**
 * Send an email using SichrPlace branding and templates.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text body (optional)
 * @returns {Promise}
 */
async function sendMail({ to, subject, html, text }) {
  const mailOptions = {
    from: process.env.MAIL_FROM || '"SichrPlace Team" <no-reply@sichrplace.com>',
    to,
    subject,
    html,
    text
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    // Log preview URL if using ethereal
    if (nodemailer.getTestMessageUrl) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
}

module.exports = { sendMail };