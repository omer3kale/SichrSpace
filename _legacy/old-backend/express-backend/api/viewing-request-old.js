const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const ViewingRequest = require('../models/ViewingRequest');

// Email configuration for SichrPlace
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'sichrplace@gmail.com',
    pass: process.env.EMAIL_PASSWORD // Set this in your environment variables
  }
});

// PayPal configuration
const { 
  PayPalApi,
  OrdersController,
  paymentsOrdersGetRequest,
  Environment 
} = require('@paypal/paypal-server-sdk');

// Initialize PayPal client
const paypalClient = new PayPalApi({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID,
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET,
  },
  environment: process.env.NODE_ENV === 'production' ? Environment.Live : Environment.Sandbox,
});

// Submit viewing request with PayPal payment
router.post('/viewing-request', async (req, res) => {
  try {
    const {
      apartmentId,
      viewingDate,
      viewingTime,
      applicantName,
      applicantEmail,
      applicantPhone,
      questions,
      attentionPoints,
      paymentId,
      paymentStatus,
      paymentAmount,
      paymentCurrency,
      payerEmail,
      payerName
    } = req.body;

    // Validate required fields
    if (!apartmentId || !viewingDate || !viewingTime || !applicantName || !applicantEmail || !applicantPhone || !paymentId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['apartmentId', 'viewingDate', 'viewingTime', 'applicantName', 'applicantEmail', 'applicantPhone', 'paymentId']
      });
    }

    // Verify PayPal payment
    const verifyPayment = await verifyPayPalPayment(paymentId);
    if (!verifyPayment.success) {
      return res.status(400).json({ 
        error: 'Payment verification failed',
        details: verifyPayment.error
      });
    }

    // Create viewing request in database
    const viewingRequest = new ViewingRequest({
      apartmentId,
      viewingDate: new Date(viewingDate),
      viewingTime,
      applicantName,
      applicantEmail,
      applicantPhone,
      questions: questions || '',
      attentionPoints: attentionPoints || '',
      paymentId,
      paymentStatus,
      paymentAmount: parseFloat(paymentAmount),
      paymentCurrency,
      payerEmail,
      payerName,
      status: 'pending',
      submittedAt: new Date()
    });

    await viewingRequest.save();

    // Send confirmation email to applicant
    await sendConfirmationEmail(viewingRequest);

    // Send notification email to SichrPlace team
    await sendInternalNotification(viewingRequest);

    // Assign customer manager (simulate assignment)
    const customerManager = await assignCustomerManager();
    
    // Update viewing request with assigned manager
    viewingRequest.assignedManager = customerManager.name;
    viewingRequest.assignedManagerEmail = customerManager.email;
    await viewingRequest.save();

    // Send customer manager assignment email
    await sendManagerAssignmentEmail(viewingRequest, customerManager);

    res.status(201).json({
      success: true,
      message: 'Viewing request submitted successfully',
      requestId: viewingRequest._id,
      assignedManager: customerManager.name,
      nextSteps: [
        'Payment confirmation sent to your email',
        'Customer manager assigned and will contact you within 24 hours',
        'Property inspection will be scheduled',
        'Video footage will be sent after inspection'
      ]
    });

  } catch (error) {
    console.error('Error processing viewing request:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to process viewing request. Please contact support.'
    });
  }
});

// Verify PayPal payment
async function verifyPayPalPayment(paymentId) {
  try {
    const ordersController = new OrdersController(paypalClient);
    
    const orderDetails = await ordersController.ordersGet({
      id: paymentId,
    });
    
    const order = orderDetails.result;
    
    if (order.status === 'COMPLETED' && 
        order.purchaseUnits[0].amount.value === '25.00' &&
        order.purchaseUnits[0].amount.currencyCode === 'EUR') {
      return { success: true, payment: order };
    } else {
      return { success: false, error: 'Payment not completed or amount mismatch' };
    }
  } catch (error) {
    console.error('PayPal verification error:', error);
    return { success: false, error: error.message };
  }
}

// Send confirmation email to applicant
async function sendConfirmationEmail(viewingRequest) {
  const mailOptions = {
    from: 'SichrPlace <sichrplace@gmail.com>',
    to: viewingRequest.applicantEmail,
    subject: `Viewing Request Confirmed - Apartment ${viewingRequest.apartmentId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">SichrPlace</h1>
          <p style="margin: 10px 0 0 0;">Viewing Request Confirmation</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #2563eb;">Hello ${viewingRequest.applicantName},</h2>
          
          <p>Thank you for your viewing request! We have successfully received your payment and request for apartment viewing.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #374151;">Viewing Details:</h3>
            <p><strong>Apartment ID:</strong> ${viewingRequest.apartmentId}</p>
            <p><strong>Requested Date:</strong> ${viewingRequest.viewingDate.toLocaleDateString('en-GB')}</p>
            <p><strong>Requested Time:</strong> ${viewingRequest.viewingTime}</p>
            <p><strong>Payment ID:</strong> ${viewingRequest.paymentId}</p>
            <p><strong>Service Fee:</strong> €${viewingRequest.paymentAmount}</p>
          </div>
          
          <h3 style="color: #2563eb;">What's Next?</h3>
          <ol style="color: #6b7280; line-height: 1.6;">
            <li>A customer manager will be assigned to your request within 24 hours</li>
            <li>Our team will contact you to confirm the viewing details</li>
            <li>We'll schedule a professional property inspection</li>
            <li>You'll receive detailed video footage and inspection report</li>
            <li>If you're interested, we'll facilitate contact with the landlord</li>
          </ol>
          
          <div style="background: #ecfdf5; border: 1px solid #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #065f46;"><strong>Note:</strong> Please keep this email for your records. If you have any questions, reply to this email or contact us at sichrplace@gmail.com</p>
          </div>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280;">© 2025 SichrPlace. All rights reserved.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

// Send internal notification to SichrPlace team
async function sendInternalNotification(viewingRequest) {
  const mailOptions = {
    from: 'SichrPlace System <sichrplace@gmail.com>',
    to: 'sichrplace@gmail.com',
    subject: `New Viewing Request - Apartment ${viewingRequest.apartmentId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">⚠️ New Viewing Request</h1>
          <p style="margin: 10px 0 0 0;">Action Required</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2>New viewing request received:</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #374151;">Request Details:</h3>
            <p><strong>Apartment ID:</strong> ${viewingRequest.apartmentId}</p>
            <p><strong>Applicant:</strong> ${viewingRequest.applicantName}</p>
            <p><strong>Email:</strong> ${viewingRequest.applicantEmail}</p>
            <p><strong>Phone:</strong> ${viewingRequest.applicantPhone}</p>
            <p><strong>Requested Date:</strong> ${viewingRequest.viewingDate.toLocaleDateString('en-GB')}</p>
            <p><strong>Requested Time:</strong> ${viewingRequest.viewingTime}</p>
            <p><strong>Payment ID:</strong> ${viewingRequest.paymentId}</p>
            <p><strong>Payment Status:</strong> ${viewingRequest.paymentStatus}</p>
            <p><strong>Amount Paid:</strong> €${viewingRequest.paymentAmount}</p>
          </div>
          
          ${viewingRequest.questions ? `
          <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4 style="margin: 0 0 8px 0; color: #92400e;">Questions:</h4>
            <p style="margin: 0; color: #78350f;">${viewingRequest.questions}</p>
          </div>
          ` : ''}
          
          ${viewingRequest.attentionPoints ? `
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4 style="margin: 0 0 8px 0; color: #92400e;">Attention Points:</h4>
            <p style="margin: 0; color: #78350f;">${viewingRequest.attentionPoints}</p>
          </div>
          ` : ''}
          
          <div style="background: #fee2e2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #dc2626;"><strong>Action Required:</strong> Assign a customer manager and initiate contact within 24 hours.</p>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

// Assign customer manager (simulate assignment)
async function assignCustomerManager() {
  // In a real implementation, this would query your team database
  const managers = [
    { name: 'Anna Schmidt', email: 'sichrplace@gmail.com', specialties: ['residential', 'student_housing'] },
    { name: 'Marcus Weber', email: 'sichrplace@gmail.com', specialties: ['commercial', 'luxury'] },
    { name: 'Laura Müller', email: 'sichrplace@gmail.com', specialties: ['residential', 'family_housing'] }
  ];
  
  // Random assignment for demo - implement proper logic based on availability and specialization
  const selectedManager = managers[Math.floor(Math.random() * managers.length)];
  return selectedManager;
}

// Send customer manager assignment email
async function sendManagerAssignmentEmail(viewingRequest, customerManager) {
  // Email to customer
  const customerMailOptions = {
    from: 'SichrPlace <sichrplace@gmail.com>',
    to: viewingRequest.applicantEmail,
    subject: `Customer Manager Assigned - ${customerManager.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #10b981; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">SichrPlace</h1>
          <p style="margin: 10px 0 0 0;">Customer Manager Assigned</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #2563eb;">Hello ${viewingRequest.applicantName},</h2>
          
          <p>Great news! We have assigned a dedicated customer manager to handle your viewing request.</p>
          
          <div style="background: #f0f9ff; border: 1px solid #0ea5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #0c4a6e;">Your Customer Manager:</h3>
            <p style="font-size: 18px; font-weight: bold; margin: 0 0 5px 0; color: #0c4a6e;">${customerManager.name}</p>
            <p style="margin: 0; color: #075985;">${customerManager.email}</p>
          </div>
          
          <p>${customerManager.name} will contact you within the next 24 hours to:</p>
          <ul style="color: #6b7280; line-height: 1.6;">
            <li>Confirm your viewing preferences and schedule</li>
            <li>Arrange the professional property inspection</li>
            <li>Provide you with detailed property information</li>
            <li>Answer any questions you may have</li>
          </ul>
          
          <div style="background: #ecfdf5; border: 1px solid #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #065f46;"><strong>Next Step:</strong> Please wait for ${customerManager.name} to contact you. In the meantime, prepare any additional questions you may have about the property.</p>
          </div>
        </div>
      </div>
    `
  };

  // Email to assigned manager
  const managerMailOptions = {
    from: 'SichrPlace System <sichrplace@gmail.com>',
    to: customerManager.email,
    cc: 'sichrplace@gmail.com',
    subject: `New Assignment - Viewing Request ${viewingRequest.apartmentId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🎯 New Assignment</h1>
          <p style="margin: 10px 0 0 0;">Viewing Request Assignment</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2>Hello ${customerManager.name},</h2>
          
          <p>You have been assigned to handle a new viewing request. Please contact the applicant within 24 hours.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #374151;">Assignment Details:</h3>
            <p><strong>Request ID:</strong> ${viewingRequest._id}</p>
            <p><strong>Apartment ID:</strong> ${viewingRequest.apartmentId}</p>
            <p><strong>Applicant:</strong> ${viewingRequest.applicantName}</p>
            <p><strong>Email:</strong> ${viewingRequest.applicantEmail}</p>
            <p><strong>Phone:</strong> ${viewingRequest.applicantPhone}</p>
            <p><strong>Requested Date:</strong> ${viewingRequest.viewingDate.toLocaleDateString('en-GB')}</p>
            <p><strong>Requested Time:</strong> ${viewingRequest.viewingTime}</p>
            <p><strong>Payment Status:</strong> ✅ Confirmed (€${viewingRequest.paymentAmount})</p>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;"><strong>Action Required:</strong> Contact ${viewingRequest.applicantName} within 24 hours to confirm viewing details and schedule property inspection.</p>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(customerMailOptions);
  await transporter.sendMail(managerMailOptions);
}

// Get viewing request status
router.get('/viewing-request/:id', async (req, res) => {
  try {
    const viewingRequest = await ViewingRequest.findById(req.params.id);
    if (!viewingRequest) {
      return res.status(404).json({ error: 'Viewing request not found' });
    }
    
    res.json({
      success: true,
      request: viewingRequest
    });
  } catch (error) {
    console.error('Error fetching viewing request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update viewing request status (for admin use)
router.patch('/viewing-request/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['pending', 'assigned', 'scheduled', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const viewingRequest = await ViewingRequest.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        statusNotes: notes,
        lastUpdated: new Date()
      },
      { new: true }
    );
    
    if (!viewingRequest) {
      return res.status(404).json({ error: 'Viewing request not found' });
    }
    
    res.json({
      success: true,
      message: 'Status updated successfully',
      request: viewingRequest
    });
  } catch (error) {
    console.error('Error updating viewing request status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
