const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

/**
 * Gmail Email Service for SichrPlace Platform
 * Handles all email communications for apartment viewing requests
 * Includes secure Gmail SMTP configuration with OAuth2 support
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize Gmail SMTP transporter with OAuth2 configuration
   * Uses environment variables for secure credential management
   */
  async initializeTransporter() {
    try {
      // Check if OAuth2 credentials are available
      const hasOAuth2 = process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN;
      
      console.log('📧 Initializing Gmail SMTP...');
      console.log(`🔍 OAuth2 available: ${hasOAuth2}`);
      console.log(`🔍 App Password available: ${!!process.env.GMAIL_APP_PASSWORD}`);
      console.log(`🔍 Gmail User: ${process.env.GMAIL_USER || 'sichrplace@gmail.com'}`);
      
      if (hasOAuth2) {
        console.log('🔐 Using OAuth2 authentication');
        // Gmail SMTP configuration with OAuth2 (recommended for production)
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // Use TLS
          auth: {
            type: 'OAuth2',
            user: process.env.GMAIL_USER || 'sichrplace@gmail.com',
            clientId: process.env.GMAIL_CLIENT_ID,
            clientSecret: process.env.GMAIL_CLIENT_SECRET,
            refreshToken: process.env.GMAIL_REFRESH_TOKEN,
            accessToken: process.env.GMAIL_ACCESS_TOKEN
          }
        });
      } else if (process.env.GMAIL_APP_PASSWORD) {
        console.log('🔑 Using App Password authentication');
        // Fallback to App Password authentication
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // Use TLS
          auth: {
            user: process.env.GMAIL_USER || 'sichrplace@gmail.com',
            pass: process.env.GMAIL_APP_PASSWORD // Gmail App Password
          }
        });
      } else {
        console.log('❌ No Gmail authentication credentials found');
        throw new Error('No Gmail authentication credentials configured');
      }

      // Verify connection
      await this.transporter.verify();
      console.log('✅ Gmail SMTP connection verified successfully');
    } catch (error) {
      console.error('❌ Gmail SMTP configuration error:', error.message);
      console.log('💡 Please configure Gmail credentials in environment variables');
      // Don't throw the error, just log it to prevent app crash
      this.transporter = null;
    }
  }

  /**
   * Email #1: Confirmation of Request Received
   * Sent immediately when viewing request is submitted
   */
  async sendRequestConfirmation(userEmail, userData) {
    const subject = "We've Received Your Apartment Viewing Request!";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .button { background: #2c5aa0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0; }
          .highlight { background: #e8f4fd; padding: 15px; border-left: 4px solid #2c5aa0; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SichrPlace</h1>
          <p>Your Trusted Apartment Viewing Service</p>
        </div>
        
        <div class="content">
          <h2>Hi ${userData.firstName || 'there'},</h2>
          
          <p><strong>Thanks for your request — we've received it and our team is already on it!</strong></p>
          
          <div class="highlight">
            <p>We're now checking availability and assigning a dedicated local viewer for your selected apartment. You'll receive another email shortly confirming the next steps.</p>
          </div>
          
          <p>If you have any questions in the meantime, feel free to reply to this email or reach us at <strong>sichrplace@gmail.com</strong>.</p>
          
          <p><strong>Talk soon,</strong></p>
          <p><strong>The SichrPlace Team</strong></p>
          
          <div class="highlight">
            <p><strong>📋 Your Request Details:</strong></p>
            <p>• Apartment: ${userData.apartmentAddress || 'Details being processed'}</p>
            <p>• Request ID: ${userData.requestId || 'Generated automatically'}</p>
            <p>• Submitted: ${new Date().toLocaleDateString('de-DE')}</p>
          </div>
        </div>
        
        <div class="footer">
          <p>© 2025 SichrPlace Team | sichrplace@gmail.com</p>
          <p>Making apartment hunting easier, one viewing at a time 🏠</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(userEmail, subject, html, 'request_confirmation');
  }

  /**
   * Email #2: Viewing Confirmed + Payment Instructions
   * Sent when viewer is assigned and payment is required
   */
  async sendViewingConfirmation(userEmail, userData, viewerData, paymentData) {
    const subject = "Your Viewing is Booked! Meet Your Apartment Viewer";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .button { background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0; font-weight: bold; }
          .viewer-card { background: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .payment-section { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .icon { font-size: 18px; margin-right: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏡 SichrPlace</h1>
          <p>Your Viewing is Confirmed!</p>
        </div>
        
        <div class="content">
          <h2>Hi ${userData.firstName || 'there'},</h2>
          
          <p><strong>Great news — your apartment viewing request has been confirmed!</strong></p>
          
          <div class="viewer-card">
            <h3><span class="icon">👤</span>Your local viewer:</h3>
            <p><strong>${viewerData.name || '[Viewer Name]'}</strong></p>
            <p>${viewerData.description || 'An experienced local agent who knows the area well.'}</p>
            
            <p><strong><span class="icon">📅</span>Viewing date:</strong> ${viewerData.date || '[Date & Time]'}</p>
            <p><strong><span class="icon">🏠</span>Address:</strong> ${userData.apartmentAddress || '[Property Address]'}</p>
          </div>
          
          <div class="payment-section">
            <h3><span class="icon">💳</span>Complete Your Payment</h3>
            <p>To finalize the service, please complete the payment securely via PayPal:</p>
            
            <a href="${paymentData.paymentLink || '#'}" class="button">
              💳 Pay with PayPal - €${paymentData.amount || '25.00'}
            </a>
            
            <p><strong>Total: €${paymentData.amount || '25.00'}</strong></p>
            <p>✅ Includes detailed photo/video report + personal impressions from the viewer.</p>
          </div>
          
          <p>Once we receive the payment, we'll send a reminder and deliver the viewing results shortly after the visit.</p>
          
          <p><strong>Need help?</strong> Just reply to this email.</p>
          
          <p><strong>Thanks for trusting us!</strong></p>
          <p><strong>The SichrPlace Team</strong></p>
        </div>
        
        <div class="footer">
          <p>© 2025 SichrPlace Team | sichrplace@gmail.com</p>
          <p>Secure payments powered by PayPal 🔐</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(userEmail, subject, html, 'viewing_confirmation');
  }

  /**
   * Email #3: Viewing Results with Secure Video
   * Sent when apartment viewing video is ready with secure link
   */
  async sendViewingResults(userEmail, userData, videoData, emailNotes = '') {
    const subject = "Your Apartment Viewing Video & Feedback Are Here";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #6f42c1; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .video-button { background: #6f42c1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0; font-weight: bold; text-align: center; }
          .video-section { background: #f8f9fa; border: 1px solid #dee2e6; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .security-notice { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 15px 0; font-size: 14px; }
          .notes-section { background: #e8f5e8; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; }
          .icon { font-size: 18px; margin-right: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏡 SichrPlace</h1>
          <p>Your Viewing Results Are Ready!</p>
        </div>
        
        <div class="content">
          <h2>Hi ${userData.firstName || 'there'},</h2>
          
          <p><strong>Your apartment viewing has been completed!</strong> We've created a comprehensive video tour of the apartment for you to review.</p>
          
          <div class="video-section">
            <h3><span class="icon">🎥</span>Your Private Apartment Video</h3>
            <p><strong>Apartment:</strong> ${userData.apartmentAddress}</p>
            <p><strong>Video Title:</strong> ${videoData.title}</p>
            
            <a href="${videoData.secureViewerUrl}" class="video-button" style="color: white; text-decoration: none;">
              <span class="icon">🎬</span> Watch Your Apartment Video
            </a>
            
            <div class="security-notice">
              <strong>🔒 Secure & Private:</strong> This video is protected and cannot be downloaded. It's exclusively for you and expires in 7 days for security.
            </div>
          </div>

          ${emailNotes ? `
          <div class="notes-section">
            <h3><span class="icon">📝</span>Additional Notes from Your Viewer</h3>
            <p>${emailNotes}</p>
          </div>
          ` : ''}

          <div style="margin: 30px 0; padding: 20px; border-radius: 8px; background: #f0f7ff; border: 1px solid #cce7ff;">
            <h3><span class="icon">💭</span>What happens next?</h3>
            <ol style="margin: 15px 0; padding-left: 20px;">
              <li><strong>Review the video</strong> at your convenience</li>
              <li><strong>Take notes</strong> of any questions or concerns</li>
              <li><strong>Contact us</strong> if you need additional information</li>
              <li><strong>Make your decision</strong> with confidence</li>
            </ol>
          </div>

          <p>If you have any questions about the video or the apartment, please don't hesitate to contact us at <a href="mailto:sichrplace@gmail.com">sichrplace@gmail.com</a>.</p>
          
          <p>Best regards,<br>
          <strong>The SichrPlace Team</strong></p>
        </div>
        
        <div class="footer">
          <p>© 2025 SichrPlace Team | sichrplace@gmail.com</p>
          <p>Making apartment hunting easier, one viewing at a time 🏠</p>
          <p style="font-size: 12px; color: #999; margin-top: 10px;">
            Video link expires in 7 days. For technical support, contact us immediately.
          </p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(userEmail, subject, html, 'viewing_results');
  }

  /**
   * Email #3: Viewing Complete - Video & Feedback Ready
   * Sent when viewing is completed and results are available
   */
  async sendViewingResults(userEmail, userData, resultsData) {
    const subject = "Your Apartment Viewing Video & Feedback Are Here";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #6f42c1; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .button { background: #6f42c1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0; font-weight: bold; }
          .results-section { background: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .video-features { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .cta-section { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .icon { font-size: 18px; margin-right: 8px; }
          ul { padding-left: 20px; }
          li { margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎥 SichrPlace</h1>
          <p>Your Viewing Results Are Ready!</p>
        </div>
        
        <div class="content">
          <h2>Hi ${userData.firstName || 'there'},</h2>
          
          <p><strong>Your requested apartment viewing is now complete — and everything has been documented for you!</strong></p>
          
          <div class="results-section">
            <h3><span class="icon">🎬</span>What's included in the video report:</h3>
            <div class="video-features">
              <ul>
                <li>A full walkthrough of the apartment</li>
                <li>Impressions of the building and surroundings</li>
                <li>A quick tour of the neighborhood</li>
                <li>Answers to your specific questions and concerns</li>
              </ul>
            </div>
            
            <a href="${resultsData.videoLink || '#'}" class="button">
              📥 Watch the Viewing Video
            </a>
            
            <p><strong>Our local viewer also added personal notes to help you evaluate whether this home fits your needs.</strong></p>
          </div>
          
          <div class="cta-section">
            <h3>What do you think?</h3>
            <p><strong>Is this apartment suitable for you?</strong></p>
            <p>If so, we're happy to assist you with the next steps — including communicating with the landlord and supporting the contract process.</p>
            <p><strong>Just reply to this email to let us know how you'd like to proceed.</strong></p>
          </div>
          
          <p><strong>Looking forward to your decision!</strong></p>
          <p><strong>The SichrPlace Team</strong></p>
        </div>
        
        <div class="footer">
          <p>© 2025 SichrPlace Team | sichrplace@gmail.com</p>
          <p>Helping you find the perfect home 🏠❤️</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(userEmail, subject, html, 'viewing_results');
  }

  /**
   * Generic email sending function with error handling and logging
   */
  async sendEmail(to, subject, html, emailType) {
    try {
      if (!this.transporter) {
        await this.initializeTransporter();
      }

      const mailOptions = {
        from: {
          name: 'SichrPlace Team',
          address: process.env.GMAIL_USER || 'sichrplace@gmail.com'
        },
        to: to,
        subject: subject,
        html: html,
        // Add plain text version for better deliverability
        text: this.stripHtml(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ Email sent successfully [${emailType}]:`, {
        to: to,
        subject: subject,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId,
        emailType: emailType
      };

    } catch (error) {
      console.error(`❌ Email sending failed [${emailType}]:`, {
        to: to,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        emailType: emailType
      };
    }
  }

  /**
   * Strip HTML tags for plain text version
   */
  stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration() {
    try {
      const testResult = await this.sendEmail(
        process.env.GMAIL_USER || 'sichrplace@gmail.com',
        'SichrPlace Email Service Test',
        '<h1>Test Email</h1><p>Gmail configuration is working correctly!</p>',
        'test'
      );
      
      return testResult;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = EmailService;
