const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { paymentId, name, email, phone, apartment, date, time, paypalOrderId } = JSON.parse(event.body);

    // Validate required fields
    if (!paymentId || !name || !email || !apartment) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Configure nodemailer
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    // Email to customer
    const customerEmail = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'SichrPlace - Viewing Request Confirmed!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Viewing Request Confirmed! 🏠</h2>
          <p>Hello ${name},</p>
          <p>Your viewing request has been successfully submitted and payment confirmed!</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Viewing Details:</h3>
            <ul>
              <li><strong>Apartment:</strong> ${apartment}</li>
              <li><strong>Preferred Date:</strong> ${date || 'Not specified'}</li>
              <li><strong>Preferred Time:</strong> ${time || 'Not specified'}</li>
              <li><strong>Payment ID:</strong> ${paymentId}</li>
              <li><strong>PayPal Order ID:</strong> ${paypalOrderId}</li>
            </ul>
          </div>
          
          <p>Our customer manager will contact you within 24 hours to confirm the viewing appointment.</p>
          <p>If you have any questions, please contact us at support@sichrplace.com</p>
          
          <p>Best regards,<br>The SichrPlace Team</p>
        </div>
      `
    };

    // Email to admin
    const adminEmail = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: 'New Viewing Request - Payment Confirmed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e74c3c;">New Viewing Request Received! 💰</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Customer Details:</h3>
            <ul>
              <li><strong>Name:</strong> ${name}</li>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Phone:</strong> ${phone || 'Not provided'}</li>
            </ul>
            
            <h3>Viewing Details:</h3>
            <ul>
              <li><strong>Apartment:</strong> ${apartment}</li>
              <li><strong>Preferred Date:</strong> ${date || 'Not specified'}</li>
              <li><strong>Preferred Time:</strong> ${time || 'Not specified'}</li>
            </ul>
            
            <h3>Payment Information:</h3>
            <ul>
              <li><strong>Payment ID:</strong> ${paymentId}</li>
              <li><strong>PayPal Order ID:</strong> ${paypalOrderId}</li>
              <li><strong>Status:</strong> ✅ PAID</li>
            </ul>
          </div>
          
          <p><strong>Action Required:</strong> Please contact the customer within 24 hours to confirm the viewing appointment.</p>
        </div>
      `
    };

    // Send emails
    await transporter.sendMail(customerEmail);
    await transporter.sendMail(adminEmail);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Viewing request processed and confirmation emails sent'
      })
    };

  } catch (error) {
    console.error('Viewing request processing error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process viewing request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
