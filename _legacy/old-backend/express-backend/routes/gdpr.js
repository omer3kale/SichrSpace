const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { GdprService } = require('../services/GdprService');
const UserService = require('../services/UserService');

/**
 * POST /api/gdpr/consent
 * Record user consent
 */
router.post('/consent', [
  auth,
  body('consentTypes').isObject().withMessage('Consent types must be an object'),
  body('privacyPolicyVersion').optional().isString(),
  body('termsVersion').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await UserService.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log the consent action
    await GdprService.logDataProcessing({
      user_id: req.user.id,
      action: 'consent_update',
      data_type: 'user_consent',
      purpose: 'consent_management',
      legal_basis: 'consent',
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    // Update consent for each purpose
    for (const [purposeName, granted] of Object.entries(req.body.consentTypes)) {
      // This would need a proper purpose lookup in a real implementation
      // For now, we'll create a simple consent record
      await GdprService.createConsent({
        user_id: req.user.id,
        purpose_id: purposeName, // In real implementation, lookup purpose by name
        granted: granted
      });
    }

    res.json({ 
      success: true, 
      message: 'Consent recorded successfully'
    });
  } catch (error) {
    console.error('Error recording consent:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/gdpr/consent
 * Get user's current consent status
 */
router.get('/consent', auth, async (req, res) => {
  try {
    const consent = await GdprService.getUserConsent(req.user.id);
    
    if (!consent) {
      return res.json({ 
        success: true, 
        consent: null,
        message: 'No consent record found' 
      });
    }

    res.json({ 
      success: true, 
      consent: {
        consentTypes: consent.consentTypes,
        privacyPolicyVersion: consent.privacyPolicyVersion,
        termsVersion: consent.termsVersion,
        createdAt: consent.createdAt
      }
    });
  } catch (error) {
    console.error('Error getting consent:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/gdpr/request
 * Create a GDPR request (access, deletion, etc.)
 */
router.post('/request', [
  auth,
  body('requestType').isIn(['access', 'rectification', 'deletion', 'portability', 'restriction', 'objection'])
    .withMessage('Invalid request type'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await UserService.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check for existing pending requests of the same type
    const existingRequest = await GdprService.findExistingRequest(req.user.id, req.body.requestType);

    if (existingRequest) {
      return res.status(400).json({ 
        success: false, 
        message: `You already have a pending ${req.body.requestType} request` 
      });
    }

    const gdprRequest = await GdprService.createGdprRequest({
      userId: req.user.id,
      email: user.email,
      requestType: req.body.requestType,
      description: req.body.description,
      requestData: req.body.requestData || {}
    });

    res.json({ 
      success: true, 
      message: 'GDPR request submitted successfully',
      requestId: gdprRequest._id,
      estimatedProcessingTime: '30 days'
    });
  } catch (error) {
    console.error('Error creating GDPR request:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/gdpr/requests
 * Get user's GDPR requests
 */
router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await GdprRequest.find({ userId: req.user.id })
      .select('-responseData') // Don't send response data to user
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      requests: requests.map(req => ({
        id: req._id,
        requestType: req.requestType,
        status: req.status,
        description: req.description,
        createdAt: req.createdAt,
        expiresAt: req.expiresAt,
        processedAt: req.processedAt
      }))
    });
  } catch (error) {
    console.error('Error getting GDPR requests:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/gdpr/export
 * Export user data (Right to Data Portability)
 * This creates a request that will be processed by admin
 */
router.get('/export', auth, async (req, res) => {
  try {
    const user = await UserService.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check for existing pending export requests
    const existingRequest = await GdprService.findExistingRequest(req.user.id, 'portability');

    if (existingRequest) {
      return res.status(400).json({ 
        success: false, 
        message: 'You already have a pending data export request' 
      });
    }

    // Create a data portability request
    const gdprRequest = await GdprService.createGdprRequest({
      userId: req.user.id,
      email: user.email,
      requestType: 'portability',
      description: 'User requested data export via API',
      requestData: { requestMethod: 'api', format: 'json' }
    });

    res.json({ 
      success: true, 
      message: 'Data export request submitted. You will receive an email when your data is ready for download.',
      requestId: gdprRequest._id
    });
  } catch (error) {
    console.error('Error requesting data export:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * DELETE /api/gdpr/account
 * Request account deletion (Right to Erasure)
 */
router.delete('/account', [
  auth,
  body('confirmation').equals('DELETE_MY_ACCOUNT').withMessage('Confirmation text required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await UserService.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check for existing pending deletion requests
    const existingRequest = await GdprService.findExistingRequest(req.user.id, 'deletion');

    if (existingRequest) {
      return res.status(400).json({ 
        success: false, 
        message: 'You already have a pending account deletion request' 
      });
    }

    const gdprRequest = await GdprService.createGdprRequest({
      userId: req.user.id,
      email: user.email,
      requestType: 'deletion',
      description: 'User requested account deletion via API',
      requestData: { 
        requestMethod: 'api',
        confirmationProvided: true,
        requestedAt: new Date()
      }
    });

    res.json({ 
      success: true, 
      message: 'Account deletion request submitted. Your account will be deleted within 30 days.',
      requestId: gdprRequest._id,
      warning: 'This action cannot be undone. All your data will be permanently deleted.'
    });
  } catch (error) {
    console.error('Error requesting account deletion:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/gdpr/withdraw-consent
 * Withdraw consent for data processing
 */
router.post('/withdraw-consent', [
  auth,
  body('consentType').isIn(['analytics', 'marketing', 'functional']).withMessage('Invalid consent type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await UserService.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentConsent = await GdprService.getUserConsent(req.user.id);
    if (!currentConsent) {
      return res.status(404).json({ success: false, message: 'No consent record found' });
    }

    // Create updated consent with withdrawn permission
    const updatedConsentTypes = { ...currentConsent.consentTypes };
    updatedConsentTypes[req.body.consentType] = {
      given: false,
      timestamp: new Date()
    };

    const newConsent = await GdprService.recordConsent({
      userId: req.user.id,
      email: user.email,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      consentTypes: updatedConsentTypes,
      privacyPolicyVersion: currentConsent.privacyPolicyVersion,
      termsVersion: currentConsent.termsVersion,
      consentMethod: 'updated'
    });

    // Log the consent withdrawal
    await GdprService.logDataProcessing({
      userId: req.user.id,
      email: user.email,
      action: 'consent_withdrawn',
      dataType: 'consent_record',
      legalBasis: 'consent',
      purpose: `User withdrew consent for ${req.body.consentType}`,
      dataCategories: ['consent_data'],
      retentionPeriod: 'Until account deletion',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      processingDetails: { withdrawnConsentType: req.body.consentType }
    });

    res.json({ 
      success: true, 
      message: `Consent for ${req.body.consentType} has been withdrawn`,
      consentId: newConsent._id
    });
  } catch (error) {
    console.error('Error withdrawing consent:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
