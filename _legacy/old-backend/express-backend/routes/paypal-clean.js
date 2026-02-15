const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// PayPal configuration
const paypalBaseURL = process.env.PAYPAL_ENVIRONMENT === 'production' 
  ? 'https://api.paypal.com'
  : 'https://api.sandbox.paypal.com';

const paypalClientId = process.env.PAYPAL_CLIENT_ID;
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;

// Helper function to get PayPal access token
async function getPayPalAccessToken() {
  const auth = Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64');
  
  try {
    const response = await fetch(`${paypalBaseURL}/v1/oauth2/token`, {
      method: 'POST',
      body: 'grant_type=client_credentials',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('PayPal Access Token Error:', error);
    throw error;
  }
}

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

/**
 * @route   POST /api/paypal/create
 * @desc    Create PayPal payment order
 * @access  Private
 */
router.post('/create', auth, async (req, res) => {
  try {
    const { amount, currency = 'EUR', description = 'SichrPlace Booking Fee', apartmentId, viewingRequestId, returnUrl, cancelUrl } = req.body;
    
    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const accessToken = await getPayPalAccessToken();

    const createPayment = {
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
        user_action: 'PAY_NOW'
      }
    };

    const response = await fetch(`${paypalBaseURL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(createPayment)
    });

    const data = await response.json();

    if (response.ok) {
      // Store payment details in memory for now (in production, use database)
      if (!global.paymentStore) global.paymentStore = {};
      global.paymentStore[data.id] = {
        userId: req.userId,
        apartmentId,
        viewingRequestId,
        amount,
        currency,
        description,
        created: new Date()
      };

      res.json({
        success: true,
        orderId: data.id,
        approvalUrl: data.links.find(link => link.rel === 'approve')?.href
      });
    } else {
      console.error('PayPal Create Error:', data);
      res.status(400).json({ error: 'Failed to create PayPal order', details: data });
    }
  } catch (error) {
    console.error('PayPal creation error:', error);
    res.status(500).json({ error: 'Internal server error creating payment' });
  }
});

/**
 * @route   POST /api/paypal/execute
 * @desc    Execute/capture PayPal payment
 * @access  Private
 */
router.post('/execute', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${paypalBaseURL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (response.ok && data.status === 'COMPLETED') {
      // Get stored payment details
      const paymentDetails = global.paymentStore?.[orderId];
      
      // Here you would typically save to database
      console.log('Payment completed:', {
        orderId,
        paymentDetails,
        paypalData: data
      });

      res.json({
        success: true,
        orderId: data.id,
        status: data.status,
        paymentDetails: paymentDetails,
        message: 'Payment completed successfully'
      });
    } else {
      console.error('PayPal Capture Error:', data);
      res.status(400).json({ error: 'Failed to capture payment', details: data });
    }
  } catch (error) {
    console.error('PayPal execution error:', error);
    res.status(500).json({ error: 'Internal server error executing payment' });
  }
});

/**
 * @route   POST /api/paypal/webhook
 * @desc    Handle PayPal webhooks
 * @access  Public
 */
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    
    console.log('PayPal Webhook received:', event.event_type);
    
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        console.log('Payment capture completed:', event.resource);
        // Handle successful payment
        break;
      case 'PAYMENT.CAPTURE.DENIED':
        console.log('Payment capture denied:', event.resource);
        // Handle failed payment
        break;
      default:
        console.log('Unhandled webhook event:', event.event_type);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
