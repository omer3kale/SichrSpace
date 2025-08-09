const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const paypal = require('@paypal/checkout-server-sdk');

// PayPal configuration
const Environment = process.env.PAYPAL_ENVIRONMENT === 'production' 
  ? paypal.core.ProductionEnvironment 
  : paypal.core.SandboxEnvironment;

const paypalClient = new paypal.core.PayPalHttpClient(
  new Environment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  )
);

/**
 * @route   GET /api/paypal/config
 * @desc    Get PayPal configuration
 * @access  Public
 */
router.get('/config', (req, res) => {
  res.json({
    clientId: process.env.PAYPAL_CLIENT_ID,
    environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox'
  });
});

// Real PayPal payment creation endpoint
router.post('/create', auth, async (req, res) => {
  try {
    const { amount, currency = 'EUR', description = 'SichrPlace Booking Fee', apartmentId, viewingRequestId, returnUrl, cancelUrl } = req.body;
    
    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: amount.toString()
        },
        description: description,
        custom_id: apartmentId || '',
        invoice_id: viewingRequestId || `INV_${Date.now()}`
      }],
      application_context: {
        return_url: returnUrl || `${req.protocol}://${req.get('host')}/api/paypal/success`,
        cancel_url: cancelUrl || `${req.protocol}://${req.get('host')}/api/paypal/cancel`,
        brand_name: 'SichrPlace',
        locale: 'de-DE',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW'
      }
    });

    const order = await paypalClient.execute(request);
    
    res.json({
      success: true,
      paymentId: order.result.id,
      approvalUrl: order.result.links.find(link => link.rel === 'approve').href,
      status: 'created',
      amount: {
        value: amount,
        currency: currency
      }
    });
  } catch (error) {
    console.error('PayPal order creation error:', error);
    res.status(500).json({ error: 'Failed to create PayPal payment' });
  }
});

// Mock PayPal payment execution endpoint
router.post('/execute', auth, async (req, res) => {
  try {
    const { paymentId, payerId } = req.body;
    
    if (!paymentId || !payerId) {
      return res.status(400).json({ error: 'Missing payment ID or payer ID' });
    }
    
    // Mock payment execution
    const mockExecution = {
      paymentId,
      payerId,
      status: 'completed',
      transactionId: `TXN_${Date.now()}`,
      executedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      status: 'completed',
      transactionId: mockExecution.transactionId,
      execution: mockExecution
    });
    
  } catch (error) {
    console.error('PayPal payment execution error:', error);
    res.status(500).json({ error: 'Failed to execute PayPal payment', details: error.message });
  }
});

// PayPal webhook endpoint for payment notifications
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    
    console.log('PayPal webhook received:', webhookData.event_type);
    
    // Process different webhook events
    switch (webhookData.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        console.log('Payment completed:', webhookData.resource?.id);
        
        // Trigger automatic payment confirmation email
        await handlePaymentCompleted(webhookData);
        break;
        
      case 'PAYMENT.CAPTURE.DENIED':
        console.log('Payment denied:', webhookData.resource?.id);
        
        // Handle payment denial
        await handlePaymentDenied(webhookData);
        break;
        
      default:
        console.log('Unhandled webhook event:', webhookData.event_type);
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('PayPal webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle completed payment - send confirmation email
 */
async function handlePaymentCompleted(webhookData) {
  try {
    const EmailService = require('../services/emailService');
    const emailService = new EmailService();
    
    // Extract payment data from webhook
    const paymentData = {
      transactionId: webhookData.resource?.id,
      amount: webhookData.resource?.amount?.value,
      currency: webhookData.resource?.amount?.currency_code,
      payerId: webhookData.resource?.payer?.payer_id,
      status: 'completed'
    };
    
    // Get user email from payment data (you may need to store this during payment creation)
    const userEmail = webhookData.resource?.payer?.email_address;
    
    if (userEmail) {
      const userData = {
        firstName: webhookData.resource?.payer?.name?.given_name || 'there'
      };
      
      // Send payment confirmation email
      const emailResult = await emailService.sendPaymentConfirmation(
        userEmail,
        userData,
        paymentData
      );
      
      console.log('Payment confirmation email sent:', emailResult.success);
    }
    
    // Update viewing request status in database
    // You can implement this based on your database structure
    
  } catch (error) {
    console.error('Error handling payment completion:', error);
  }
}

/**
 * Handle payment denial
 */
async function handlePaymentDenied(webhookData) {
  try {
    // Log payment denial
    console.log('Payment denied for transaction:', webhookData.resource?.id);
    
    // You can implement additional logic here like:
    // - Updating database status
    // - Sending notification emails
    // - Releasing reserved viewing slots
    
  } catch (error) {
    console.error('Error handling payment denial:', error);
  }
}

// PayPal configuration endpoint
router.get('/config', (req, res) => {
  try {
    const config = {
      clientId: process.env.PAYPAL_CLIENT_ID ? 'configured' : null,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      currency: 'EUR',
      supportedPaymentMethods: ['paypal', 'card']
    };
    
    res.json(config);
    
  } catch (error) {
    console.error('PayPal config error:', error);
    res.status(500).json({ error: 'Failed to get PayPal configuration' });
  }
});

module.exports = router;
