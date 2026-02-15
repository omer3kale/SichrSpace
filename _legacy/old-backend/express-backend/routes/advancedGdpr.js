const express = require('express');
const router = express.Router();
const AdvancedGdprService = require('../utils/advancedGdprService');
const PrivacyComplianceScanner = require('../utils/privacyComplianceScanner');
const GdprService = require('../services/GdprService');

/**
 * Advanced Consent Management Routes
 */

// Create GDPR request endpoint
router.post('/requests', async (req, res) => {
  try {
    const { request_type, description } = req.body;
    
    if (!request_type) {
      return res.status(400).json({ error: 'Request type is required' });
    }

    const requestData = {
      request_type,
      description: description || `GDPR ${request_type} request`,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const result = await GdprService.createRequest(requestData);

    res.status(201).json({
      success: true,
      message: 'GDPR request created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating GDPR request:', error);
    res.status(500).json({ error: 'Failed to create GDPR request', details: error.message });
  }
});

// Get all consent purposes with statistics
router.get('/consent-purposes', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const consents = await GdprService.getConsentPurposes({ skip, limit });
    const total = await GdprService.countConsentPurposes();

    // Get consent statistics
    const stats = await GdprService.getConsentStatistics();

    res.json({
      consents,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      },
      statistics: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update consent purpose settings
router.put('/consent-purposes/:purposeId', async (req, res) => {
  try {
    const { purposeId } = req.params;
    const updates = req.body;

    const consent = await ConsentPurpose.findByIdAndUpdate(
      purposeId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );

    if (!consent) {
      return res.status(404).json({ error: 'Consent purpose not found' });
    }

    res.json(consent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk consent cleanup (expired/withdrawn)
router.post('/consent-purposes/cleanup', async (req, res) => {
  try {
    const { action } = req.body; // 'deactivate_expired' or 'remove_withdrawn'

    let result;
    if (action === 'deactivate_expired') {
      result = await ConsentPurpose.updateMany(
        { expiryDate: { $lt: new Date() }, isActive: true },
        { isActive: false, updatedAt: new Date() }
      );
    } else if (action === 'remove_withdrawn') {
      result = await ConsentPurpose.deleteMany({
        withdrawalTimestamp: { $exists: true },
        withdrawalTimestamp: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // 90 days old
      });
    }

    res.json({
      message: `Consent cleanup completed`,
      affected: result.modifiedCount || result.deletedCount,
      action
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Data Breach Management Routes
 */

// Get all data breaches
router.get('/data-breaches', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, severity } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const breaches = await DataBreach.find(filter)
      .sort({ discoveredAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await DataBreach.countDocuments(filter);

    // Get breach statistics
    const stats = await DataBreach.aggregate([
      {
        $group: {
          _id: null,
          totalBreaches: { $sum: 1 },
          unreported: { $sum: { $cond: [{ $eq: ['$reportedToAuthority', false] }, 1, 0] } },
          highRisk: { $sum: { $cond: [{ $eq: ['$riskAssessment.overallRisk', 'high'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      breaches,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      },
      statistics: stats[0] || {}
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new data breach report
router.post('/data-breaches', async (req, res) => {
  try {
    const breach = await AdvancedGdprService.reportDataBreach(req.body);
    res.status(201).json(breach);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update breach status
router.put('/data-breaches/:breachId/status', async (req, res) => {
  try {
    const { breachId } = req.params;
    const { status, notes } = req.body;

    const breach = await AdvancedGdprService.updateBreachStatus(breachId, status, notes);
    res.json(breach);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark breach as reported to authority
router.put('/data-breaches/:breachId/report-authority', async (req, res) => {
  try {
    const { breachId } = req.params;
    const { reportDetails } = req.body;

    const breach = await DataBreach.findByIdAndUpdate(
      breachId,
      {
        reportedToAuthority: true,
        authorityNotification: {
          reportedAt: new Date(),
          reportReference: reportDetails.reference,
          reportedBy: req.user.username,
          reportDetails
        }
      },
      { new: true }
    );

    res.json(breach);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notify affected users
router.post('/data-breaches/:breachId/notify-users', async (req, res) => {
  try {
    const { breachId } = req.params;
    const { notificationMessage } = req.body;

    const breach = await DataBreach.findById(breachId);
    if (!breach) {
      return res.status(404).json({ error: 'Breach not found' });
    }

    // Update notification status for all affected users
    await DataBreach.updateOne(
      { _id: breachId },
      {
        $set: {
          'affectedUsers.$[].notified': true,
          'affectedUsers.$[].notificationDate': new Date()
        }
      }
    );

    res.json({ message: 'User notifications sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DPIA Management Routes
 */

// Get all DPIAs
router.get('/dpias', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const dpias = await DPIA.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await DPIA.countDocuments(filter);

    // Get DPIA statistics
    const stats = await DPIA.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      dpias,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      },
      statistics: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new DPIA
router.post('/dpias', async (req, res) => {
  try {
    const dpia = await AdvancedGdprService.createDPIA(req.body);
    res.status(201).json(dpia);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update DPIA status
router.put('/dpias/:dpiaId', async (req, res) => {
  try {
    const { dpiaId } = req.params;
    const updates = req.body;

    const dpia = await DPIA.findByIdAndUpdate(
      dpiaId,
      { ...updates, lastUpdated: new Date() },
      { new: true }
    );

    if (!dpia) {
      return res.status(404).json({ error: 'DPIA not found' });
    }

    res.json(dpia);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedule DPIA review
router.post('/dpias/:dpiaId/schedule-review', async (req, res) => {
  try {
    const { dpiaId } = req.params;
    const { reviewDate, reviewType } = req.body;

    const dpia = await DPIA.findByIdAndUpdate(
      dpiaId,
      {
        'reviewSchedule.nextReview': new Date(reviewDate),
        'reviewSchedule.reviewType': reviewType,
        'reviewSchedule.scheduledBy': req.user.username,
        'reviewSchedule.scheduledAt': new Date()
      },
      { new: true }
    );

    res.json(dpia);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Compliance Monitoring Routes
 */

// Run compliance scan
router.get('/compliance/scan', async (req, res) => {
  try {
    const report = await PrivacyComplianceScanner.generateDetailedReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get compliance dashboard data
router.get('/compliance/dashboard', async (req, res) => {
  try {
    const [
      consentStats,
      breachStats,
      dpiaStats,
      recentLogs
    ] = await Promise.all([
      ConsentPurpose.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$isActive', 1, 0] } },
            expired: { $sum: { $cond: [{ $lt: ['$expiryDate', new Date()] }, 1, 0] } }
          }
        }
      ]),
      DataBreach.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unresolved: { $sum: { $cond: [{ $ne: ['$status', 'resolved'] }, 1, 0] } },
            unreported: { $sum: { $cond: [{ $eq: ['$reportedToAuthority', false] }, 1, 0] } }
          }
        }
      ]),
      DPIA.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
            needsReview: { $sum: { $cond: [{ $lt: ['$reviewSchedule.nextReview', new Date()] }, 1, 0] } }
          }
        }
      ]),
      DataProcessingLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('action dataType legalBasis createdAt')
    ]);

    res.json({
      consents: consentStats[0] || { total: 0, active: 0, expired: 0 },
      breaches: breachStats[0] || { total: 0, unresolved: 0, unreported: 0 },
      dpias: dpiaStats[0] || { total: 0, approved: 0, needsReview: 0 },
      recentActivity: recentLogs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get processing logs
router.get('/processing-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const { action, dataType, legalBasis } = req.query;

    const filter = {};
    if (action) filter.action = action;
    if (dataType) filter.dataType = dataType;
    if (legalBasis) filter.legalBasis = legalBasis;

    const logs = await DataProcessingLog.find(filter)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await DataProcessingLog.countDocuments(filter);

    res.json({
      logs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export compliance report
router.get('/compliance/export', async (req, res) => {
  try {
    const { format = 'json', dateFrom, dateTo } = req.query;
    
    const dateFilter = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom);
    if (dateTo) dateFilter.$lte = new Date(dateTo);
    
    const filter = {};
    if (Object.keys(dateFilter).length > 0) {
      filter.createdAt = dateFilter;
    }

    const [
      consents,
      breaches,
      dpias,
      logs
    ] = await Promise.all([
      ConsentPurpose.find(filter),
      DataBreach.find(filter),
      DPIA.find(filter),
      DataProcessingLog.find(filter).limit(1000) // Limit to prevent memory issues
    ]);

    const reportData = {
      exportDate: new Date(),
      period: { from: dateFrom, to: dateTo },
      summary: {
        consents: consents.length,
        breaches: breaches.length,
        dpias: dpias.length,
        processingLogs: logs.length
      },
      data: {
        consents,
        breaches,
        dpias,
        processingLogs: logs
      }
    };

    if (format === 'csv') {
      // Convert to CSV format (simplified)
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=compliance-report.csv');
      // CSV conversion logic would go here
      res.send('CSV export not implemented yet');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=compliance-report.json');
      res.json(reportData);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run daily compliance check manually
router.post('/compliance/daily-check', async (req, res) => {
  try {
    const results = await AdvancedGdprService.runDailyComplianceCheck();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
