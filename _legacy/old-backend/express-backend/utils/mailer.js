const nodemailer = require('nodemailer');

// Configure transporter for Gmail SMTP using environment variables
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER || 'omer3kale@gmail.com', // Use env var or fallback
    pass: process.env.GMAIL_APP_PASSWORD || 'zbtr fcsc tqyf nxhp' // Use correct app password
  },
  tls: {
    rejectUnauthorized: false
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
    from: '"SichrPlace Team" <omer3kale@gmail.com>',
    to,
    subject,
    html,
    text
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent successfully:', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ Error sending email:', err);
    throw err;
  }
}

module.exports = { sendMail };
