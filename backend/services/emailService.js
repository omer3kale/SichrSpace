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
      const hasOAuth2 = process.env.GMAIL_CLIENT_ID && 
                       process.env.GMAIL_CLIENT_SECRET && 
                       process.env.GMAIL_REFRESH_TOKEN &&
                       process.env.GMAIL_CLIENT_ID !== 'your-google-oauth2-client-id.apps.googleusercontent.com';
      
      console.log('📧 Initializing Gmail SMTP...');
      console.log(`🔍 OAuth2 available: ${hasOAuth2 ? 'YES - Configured' : 'NO - Using App Password fallback'}`);
      console.log(`🔍 App Password available: ${!!process.env.GMAIL_APP_PASSWORD ? 'YES' : 'NO'}`);
      console.log(`🔍 Gmail User: ${process.env.GMAIL_USER || 'omer3kale@gmail.com'}`);
      
      if (hasOAuth2) {
        console.log('🔐 Using OAuth2 authentication (Production Grade)');
        // Gmail SMTP configuration with OAuth2 (recommended for production)
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // Use TLS
          auth: {
            type: 'OAuth2',
            user: process.env.GMAIL_USER || 'omer3kale@gmail.com',
            clientId: process.env.GMAIL_CLIENT_ID,
            clientSecret: process.env.GMAIL_CLIENT_SECRET,
            refreshToken: process.env.GMAIL_REFRESH_TOKEN,
            accessToken: process.env.GMAIL_ACCESS_TOKEN
          }
        });
            } else if (process.env.GMAIL_APP_PASSWORD) {
        console.log('🔑 Using App Password authentication (Development Mode)');
        // Fallback to App Password authentication
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // Use TLS
          auth: {
            user: process.env.GMAIL_USER || 'omer3kale@gmail.com',
            pass: process.env.GMAIL_APP_PASSWORD // Gmail App Password
          }
        });
      } else {
        console.log('❌ No Gmail authentication credentials found');
        console.log('💡 To enable OAuth2:');
        console.log('   1. Set up Google Cloud Console project');
        console.log('   2. Enable Gmail API');
        console.log('   3. Configure OAuth2 credentials');
        console.log('   4. Update environment variables');
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
   * Email #4: Payment Confirmation
   * Sent when PayPal payment is successfully processed
   */
  async sendPaymentConfirmation(userEmail, userData, paymentData) {
    const subject = "Payment Confirmed! Your Viewing is Secured ✅";
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
          .payment-confirmation { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .next-steps { background: #e2f3ff; border: 1px solid #b8daff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .icon { font-size: 18px; margin-right: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏡 SichrPlace</h1>
          <p>Payment Confirmed!</p>
        </div>
        
        <div class="content">
          <h2>Hi ${userData.firstName || 'there'},</h2>
          
          <p><strong>Excellent! Your payment has been successfully processed through PayPal.</strong></p>
          
          <div class="payment-confirmation">
            <h3><span class="icon">✅</span>Payment Details</h3>
            <p><strong>Amount:</strong> €${paymentData.amount || '25.00'}</p>
            <p><strong>Transaction ID:</strong> ${paymentData.transactionId || 'Processing...'}</p>
            <p><strong>Payment Method:</strong> PayPal</p>
            <p><strong>Status:</strong> Confirmed</p>
          </div>
          
          <div class="next-steps">
            <h3><span class="icon">📅</span>What Happens Next</h3>
            <ul>
              <li><strong>Viewer Notification:</strong> Your assigned viewer has been notified and will prepare for the visit</li>
              <li><strong>Viewing Reminder:</strong> We'll send you a reminder 24 hours before your viewing</li>
              <li><strong>Video Report:</strong> After the viewing, you'll receive a detailed video report and feedback</li>
              <li><strong>Next Steps Support:</strong> Our team will help you with any follow-up questions</li>
            </ul>
          </div>
          
          <p><strong>Your viewing is now secured and confirmed!</strong></p>
          
          <p>If you have any questions, just reply to this email or contact us at <strong>sichrplace@gmail.com</strong>.</p>
          
          <p><strong>Thanks for choosing SichrPlace!</strong></p>
          <p><strong>The SichrPlace Team</strong></p>
        </div>
        
        <div class="footer">
          <p>© 2025 SichrPlace Team | sichrplace@gmail.com</p>
          <p>Helping you find the perfect home 🏠❤️</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(userEmail, subject, html, 'payment_confirmation');
  }

  /**
   * Email #5: Viewing Reminder  
   * Sent 24 hours before the scheduled viewing
   */
  async sendViewingReminder(userEmail, userData, viewingData) {
    const subject = "Reminder: Your Apartment Viewing is Tomorrow! 📅";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #ffc107; color: #212529; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .reminder-card { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .contact-info { background: #e8f4fd; border: 1px solid #b8daff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .icon { font-size: 18px; margin-right: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏡 SichrPlace</h1>
          <p>Viewing Reminder</p>
        </div>
        
        <div class="content">
          <h2>Hi ${userData.firstName || 'there'},</h2>
          
          <p><strong>Just a friendly reminder — your apartment viewing is scheduled for tomorrow!</strong></p>
          
          <div class="reminder-card">
            <h3><span class="icon">📅</span>Viewing Details</h3>
            <p><strong>Date & Time:</strong> ${viewingData.datetime || '[Tomorrow at scheduled time]'}</p>
            <p><strong>Address:</strong> ${userData.apartmentAddress || '[Property Address]'}</p>
            <p><strong>Viewer:</strong> ${viewingData.viewerName || '[Your assigned viewer]'}</p>
          </div>
          
          <div class="contact-info">
            <h3><span class="icon">📱</span>Your Viewer's Contact</h3>
            <p><strong>Name:</strong> ${viewingData.viewerName || '[Viewer Name]'}</p>
            <p><strong>Phone:</strong> ${viewingData.viewerPhone || '[Phone Number]'}</p>
            <p><strong>Email:</strong> ${viewingData.viewerEmail || '[Email Address]'}</p>
          </div>
          
          <p><strong>What to expect:</strong></p>
          <ul>
            <li>Professional photo and video documentation</li>
            <li>Detailed inspection of all rooms and facilities</li>
            <li>Neighborhood overview and local insights</li>
            <li>Written feedback and recommendations</li>
          </ul>
          
          <p><strong>You'll receive the complete viewing report within 24 hours of the visit.</strong></p>
          
          <p>If you need to make any changes or have questions, please contact us immediately at <strong>sichrplace@gmail.com</strong>.</p>
          
          <p><strong>Looking forward to helping you with your apartment search!</strong></p>
          <p><strong>The SichrPlace Team</strong></p>
        </div>
        
        <div class="footer">
          <p>© 2025 SichrPlace Team | sichrplace@gmail.com</p>
          <p>Professional apartment viewing services 🏠</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(userEmail, subject, html, 'viewing_reminder');
  }

  /**
   * Test email template method
   * Used by the email routes for testing
   */
  async sendTestEmail(userEmail, subject, message) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #6c757d; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🧪 SichrPlace Test Email</h1>
        </div>
        
        <div class="content">
          <h2>Test Email</h2>
          <p>${message || 'This is a test email from SichrPlace email service.'}</p>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="footer">
          <p>© 2025 SichrPlace Team | sichrplace@gmail.com</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(userEmail, subject, html, 'test');
  }

  /**
   * Generic viewing ready email method
   * Used by email routes
   */
  async sendViewingReadyEmail(userEmail, userData) {
    const subject = "Your Viewing Request is Being Processed";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #17a2b8; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏡 SichrPlace</h1>
          <p>Processing Your Request</p>
        </div>
        
        <div class="content">
          <h2>Hi there,</h2>
          <p><strong>Your viewing request is being processed by our team.</strong></p>
          <p>${userData.message || 'We will update you soon with more details.'}</p>
          <p><strong>The SichrPlace Team</strong></p>
        </div>
        
        <div class="footer">
          <p>© 2025 SichrPlace Team | sichrplace@gmail.com</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(userEmail, subject, html, 'viewing_ready');
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

  /**
   * Send email verification to new users
   */
  async sendVerificationEmail(email, firstName, verificationToken) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
      
      const mailOptions = {
        from: {
          name: 'SichrPlace Team',
          address: process.env.GMAIL_USER || 'omer3kale@gmail.com'
        },
        to: email,
        subject: 'Welcome to SichrPlace - Verify Your Email',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email - SichrPlace</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
              .container { max-width: 600px; margin: 0 auto; background: white; }
              .header { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 40px 30px; text-align: center; }
              .logo { color: white; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
              .header-text { color: white; font-size: 18px; margin: 0; }
              .content { padding: 40px 30px; }
              .welcome-text { font-size: 24px; color: #1f2937; margin-bottom: 20px; font-weight: 600; }
              .message { color: #6b7280; line-height: 1.6; margin-bottom: 30px; font-size: 16px; }
              .verify-button { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px; }
              .verify-button:hover { background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); }
              .footer { padding: 30px; background: #f8fafc; text-align: center; color: #6b7280; font-size: 14px; }
              .divider { height: 1px; background: #e5e7eb; margin: 30px 0; }
              .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0; }
              .warning-text { color: #92400e; margin: 0; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🏠 SichrPlace</div>
                <p class="header-text">Trusted Apartment Viewing Service</p>
              </div>
              
              <div class="content">
                <h1 class="welcome-text">Welcome ${firstName}!</h1>
                
                <p class="message">
                  Thank you for joining SichrPlace, the trusted platform for secure apartment viewings. 
                  To complete your registration and start exploring apartments, please verify your email address.
                </p>
                
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${verificationUrl}" class="verify-button">Verify Email Address</a>
                </div>
                
                <div class="warning">
                  <p class="warning-text">
                    <strong>Security Note:</strong> This verification link will expire in 24 hours. 
                    If you didn't create this account, please ignore this email.
                  </p>
                </div>
                
                <div class="divider"></div>
                
                <p style="color: #6b7280; font-size: 14px;">
                  If the button above doesn't work, copy and paste this link into your browser:<br>
                  <a href="${verificationUrl}" style="color: #2563eb; word-break: break-all;">${verificationUrl}</a>
                </p>
              </div>
              
              <div class="footer">
                <p>© 2025 SichrPlace. All rights reserved.</p>
                <p>Need help? Contact us at <a href="mailto:support@sichrplace.com" style="color: #2563eb;">support@sichrplace.com</a></p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent successfully to:', email);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, firstName, resetToken) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: {
          name: 'SichrPlace Security',
          address: process.env.GMAIL_USER || 'omer3kale@gmail.com'
        },
        to: email,
        subject: 'Reset Your SichrPlace Password',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password - SichrPlace</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
              .container { max-width: 600px; margin: 0 auto; background: white; }
              .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 40px 30px; text-align: center; }
              .logo { color: white; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
              .header-text { color: white; font-size: 18px; margin: 0; }
              .content { padding: 40px 30px; }
              .title { font-size: 24px; color: #1f2937; margin-bottom: 20px; font-weight: 600; }
              .message { color: #6b7280; line-height: 1.6; margin-bottom: 30px; font-size: 16px; }
              .reset-button { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px; }
              .footer { padding: 30px; background: #f8fafc; text-align: center; color: #6b7280; font-size: 14px; }
              .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 20px 0; }
              .warning-text { color: #dc2626; margin: 0; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🔒 SichrPlace Security</div>
                <p class="header-text">Password Reset Request</p>
              </div>
              
              <div class="content">
                <h1 class="title">Reset Your Password</h1>
                
                <p class="message">
                  Hello ${firstName},<br><br>
                  We received a request to reset your SichrPlace account password. 
                  Click the button below to create a new password.
                </p>
                
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${resetUrl}" class="reset-button">Reset Password</a>
                </div>
                
                <div class="warning">
                  <p class="warning-text">
                    <strong>Security Notice:</strong> This link will expire in 1 hour. 
                    If you didn't request this reset, please ignore this email and your password will remain unchanged.
                  </p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                  If the button doesn't work, copy and paste this link:<br>
                  <a href="${resetUrl}" style="color: #dc2626; word-break: break-all;">${resetUrl}</a>
                </p>
              </div>
              
              <div class="footer">
                <p>© 2025 SichrPlace. All rights reserved.</p>
                <p>For security questions: <a href="mailto:security@sichrplace.com" style="color: #dc2626;">security@sichrplace.com</a></p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent successfully to:', email);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send password change confirmation email
   */
  async sendPasswordChangeConfirmation(email, firstName) {
    try {
      const mailOptions = {
        from: {
          name: 'SichrPlace Security',
          address: process.env.GMAIL_USER || 'omer3kale@gmail.com'
        },
        to: email,
        subject: 'Password Changed Successfully - SichrPlace',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Changed - SichrPlace</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
              .container { max-width: 600px; margin: 0 auto; background: white; }
              .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 30px; text-align: center; }
              .logo { color: white; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
              .header-text { color: white; font-size: 18px; margin: 0; }
              .content { padding: 40px 30px; }
              .title { font-size: 24px; color: #1f2937; margin-bottom: 20px; font-weight: 600; }
              .message { color: #6b7280; line-height: 1.6; margin-bottom: 30px; font-size: 16px; }
              .footer { padding: 30px; background: #f8fafc; text-align: center; color: #6b7280; font-size: 14px; }
              .success { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 20px 0; }
              .success-text { color: #166534; margin: 0; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">✅ SichrPlace Security</div>
                <p class="header-text">Password Changed Successfully</p>
              </div>
              
              <div class="content">
                <h1 class="title">Password Updated</h1>
                
                <p class="message">
                  Hello ${firstName},<br><br>
                  Your SichrPlace account password has been successfully changed on ${new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}.
                </p>
                
                <div class="success">
                  <p class="success-text">
                    <strong>Security Confirmation:</strong> Your account is now secured with your new password. 
                    If you did not make this change, please contact our security team immediately.
                  </p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                  For additional security, we recommend:
                  <ul style="color: #6b7280;">
                    <li>Using a unique password for your SichrPlace account</li>
                    <li>Enabling two-factor authentication when available</li>
                    <li>Keeping your email secure</li>
                  </ul>
                </p>
              </div>
              
              <div class="footer">
                <p>© 2025 SichrPlace. All rights reserved.</p>
                <p>Security concerns? Contact: <a href="mailto:security@sichrplace.com" style="color: #059669;">security@sichrplace.com</a></p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password change confirmation sent successfully to:', email);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Failed to send password change confirmation:', error);
      throw new Error('Failed to send password change confirmation');
    }
  }

  /**
   * Send welcome email to verified users
   */
  async sendWelcomeEmail(email, firstName, userRole) {
    try {
      const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${userRole === 'landlord' ? 'landlord-dashboard' : 'apartments-listing'}.html`;
      
      const mailOptions = {
        from: {
          name: 'SichrPlace Team',
          address: process.env.GMAIL_USER || 'omer3kale@gmail.com'
        },
        to: email,
        subject: 'Welcome to SichrPlace - Let\'s Get Started!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to SichrPlace</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
              .container { max-width: 600px; margin: 0 auto; background: white; }
              .header { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 40px 30px; text-align: center; }
              .logo { color: white; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
              .content { padding: 40px 30px; }
              .title { font-size: 24px; color: #1f2937; margin-bottom: 20px; font-weight: 600; }
              .feature { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2563eb; }
              .cta-button { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px; }
              .footer { padding: 30px; background: #f8fafc; text-align: center; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🏠 SichrPlace</div>
                <p style="color: white; margin: 0;">Welcome to the Future of Apartment Viewing</p>
              </div>
              
              <div class="content">
                <h1 class="title">Welcome ${firstName}!</h1>
                
                <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
                  Your email has been verified and your SichrPlace account is now active! 
                  As a ${userRole}, you now have access to all our features.
                </p>
                
                ${userRole === 'landlord' ? `
                  <div class="feature">
                    <h3 style="margin: 0 0 10px 0; color: #1f2937;">🏢 Landlord Features</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
                      <li>List your properties with photos and videos</li>
                      <li>Manage viewing requests efficiently</li>
                      <li>Connect with verified tenants</li>
                      <li>Secure payment processing</li>
                    </ul>
                  </div>
                ` : `
                  <div class="feature">
                    <h3 style="margin: 0 0 10px 0; color: #1f2937;">🏠 Tenant Features</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
                      <li>Browse verified apartment listings</li>
                      <li>Request professional video viewings</li>
                      <li>Secure payment and booking system</li>
                      <li>Direct communication with landlords</li>
                    </ul>
                  </div>
                `}
                
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${dashboardUrl}" class="cta-button">
                    ${userRole === 'landlord' ? 'Go to Landlord Dashboard' : 'Start Browsing Apartments'}
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                  Need help getting started? Check out our 
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/help" style="color: #2563eb;">help center</a> 
                  or contact our support team.
                </p>
              </div>
              
              <div class="footer">
                <p>© 2025 SichrPlace. All rights reserved.</p>
                <p>Questions? Contact us at <a href="mailto:support@sichrplace.com" style="color: #2563eb;">support@sichrplace.com</a></p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent successfully to:', email);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      throw new Error('Failed to send welcome email');
    }
  }
}

module.exports = EmailService;
