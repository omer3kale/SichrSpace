// payment.js
const express = require('express');
const router = express.Router();
const PaymentService = require('../services/PaymentService');

// POST /api/payment/checkout
router.post('/checkout', async (req, res) => {
  const { userId, priceId, successUrl, cancelUrl } = req.body;
  const result = await PaymentService.createCheckoutSession({ userId, priceId, successUrl, cancelUrl });
  res.json(result);
});

// POST /api/payment/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const event = req.body;
  const result = await PaymentService.handleWebhook(event);
  res.json(result);
});

// GET /api/payment/status/:userId
router.get('/status/:userId', async (req, res) => {
  const { userId } = req.params;
  const result = await PaymentService.getSubscriptionStatus(userId);
  res.json(result);
});

module.exports = router;
