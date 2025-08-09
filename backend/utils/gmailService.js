/**
 * Gmail SMTP Configuration and Test Utilities
 * Configures and tests Gmail SMTP integration for SichrPlace
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

class GmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
  }

  /**
   * Initialize Gmail SMTP transporter
   */
  async initialize() {
    try {
      // Check if Gmail credentials are available
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('⚠️  Gmail credentials not found in environment variables');
        console.log('   Please set EMAIL_USER and EMAIL_PASS environmental variables');
        return false;
      }

      // Create transporter
      this.transporter = nodemailer.createTransporter({
        service: 'gmail',
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS // Gmail App Password
        },
        tls: {
          rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
        }
      });

      // Verify connection
      await this.transporter.verify();
      this.isConfigured = true;
      
      console.log('✅ Gmail SMTP configured successfully');
      console.log(`   User: ${process.env.EMAIL_USER}`);
      console.log(`   Host: ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}`);
      
      return true;
    } catch (error) {
      console.error('❌ Gmail SMTP configuration failed:', error.message);
      console.log('\n💡 Gmail Setup Instructions:');
      console.log('1. Enable 2-Factor Authentication on your Gmail account');
      console.log('2. Generate an App Password: https://myaccount.google.com/apppasswords');
      console.log('3. Set environment variables:');
      console.log('   EMAIL_USER=your-email@gmail.com');
      console.log('   EMAIL_PASS=your-16-character-app-password');
      
      return false;
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(to = 'test@sichrplace.com') {
    if (!this.isConfigured) {
      throw new Error('Gmail SMTP not configured');
    }

    const mailOptions = {
      from: `"SichrPlace Platform" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: '🏠 SichrPlace - Email System Test',
      text: `
Hello!

This is a test email from the SichrPlace platform to verify that email functionality is working correctly.

Email system features:
✅ User registration confirmations
✅ Viewing request notifications
✅ Payment confirmations
✅ GDPR compliance communications
✅ System notifications

If you received this email, the Gmail SMTP integration is working perfectly!

Best regards,
The SichrPlace Team

---
This is an automated test email sent at ${new Date().toISOString()}
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;">
            🏠 SichrPlace Platform
          </h1>
          
          <div style="background: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
            <h2 style="color: #28a745; margin: 0;">✅ Email System Test Successful!</h2>
          </div>
          
          <p>Hello!</p>
          
          <p>This is a test email from the <strong>SichrPlace platform</strong> to verify that email functionality is working correctly.</p>
          
          <h3 style="color: #2c3e50;">📧 Email System Features:</h3>
          <ul style="line-height: 1.6;">
            <li>✅ User registration confirmations</li>
            <li>✅ Viewing request notifications</li>
            <li>✅ Payment confirmations</li>
            <li>✅ GDPR compliance communications</li>
            <li>✅ System notifications</li>
          </ul>
          
          <div style="background: #e8f5e8; border: 1px solid #28a745; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #155724;">
              <strong>🎉 Success!</strong> If you received this email, the Gmail SMTP integration is working perfectly!
            </p>
          </div>
          
          <p>Best regards,<br>
          <strong>The SichrPlace Team</strong></p>
          
          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
          <p style="color: #6c757d; font-size: 12px;">
            This is an automated test email sent at ${new Date().toISOString()}<br>
            SichrPlace - Your trusted apartment rental platform
          </p>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Test email sent successfully');
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   To: ${to}`);
      return info;
    } catch (error) {
      console.error('❌ Failed to send test email:', error.message);
      throw error;
    }
  }

  /**
   * Send viewing request notification email
   */
  async sendViewingRequestEmail(landlordEmail, apartmentTitle, requesterName, requestedDate) {
    if (!this.isConfigured) {
      throw new Error('Gmail SMTP not configured');
    }

    const mailOptions = {
      from: `"SichrPlace Platform" <${process.env.EMAIL_USER}>`,
      to: landlordEmail,
      subject: `🏠 New Viewing Request for "${apartmentTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50;">🏠 New Viewing Request</h1>
          <p><strong>${requesterName}</strong> has requested to view your apartment:</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>${apartmentTitle}</h3>
            <p><strong>Requested Date:</strong> ${new Date(requestedDate).toLocaleDateString()}</p>
          </div>
          <p>Please log in to your SichrPlace dashboard to respond to this request.</p>
        </div>
      `
    };

    return await this.transporter.sendMail(mailOptions);
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmationEmail(userEmail, apartmentTitle, amount, paymentId) {
    if (!this.isConfigured) {
      throw new Error('Gmail SMTP not configured');
    }

    const mailOptions = {
      from: `"SichrPlace Platform" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '💳 Payment Confirmation - SichrPlace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #28a745;">✅ Payment Confirmed</h1>
          <p>Your payment has been successfully processed.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Apartment:</strong> ${apartmentTitle}</p>
            <p><strong>Amount:</strong> €${amount}</p>
            <p><strong>Payment ID:</strong> ${paymentId}</p>
          </div>
          <p>Thank you for using SichrPlace!</p>
        </div>
      `
    };

    return await this.transporter.sendMail(mailOptions);
  }

  /**
   * Get transporter for direct use
   */
  getTransporter() {
    return this.transporter;
  }

  /**
   * Check if Gmail is configured
   */
  isReady() {
    return this.isConfigured;
  }
}

// Create and export singleton instance
const gmailService = new GmailService();

module.exports = {
  GmailService,
  gmailService
};

// If run directly, test the Gmail configuration
if (require.main === module) {
  async function testGmail() {
    console.log('🧪 Testing Gmail SMTP Configuration...\n');
    
    const success = await gmailService.initialize();
    if (success) {
      try {
        await gmailService.sendTestEmail();
        console.log('\n🎉 Gmail SMTP test completed successfully!');
      } catch (error) {
        console.error('\n❌ Gmail SMTP test failed:', error.message);
      }
    } else {
      console.log('\n❌ Gmail SMTP configuration failed');
    }
  }
  
  testGmail();
}
