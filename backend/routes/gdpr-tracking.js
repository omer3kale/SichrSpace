const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');

/**
 * GDPR Tracking Log Model
 * Stores audit trail of tracking activities for compliance
 */
const mongoose = require('mongoose');

const trackingLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Some logs may be anonymous
    },
    sessionId: {
        type: String,
        required: false
    },
    event: {
        type: String,
        required: true,
        enum: [
            'clarity_initialized',
            'clarity_disabled',
            'user_data_deleted',
            'consent_given',
            'consent_withdrawn',
            'tracking_blocked',
            'privacy_settings_accessed'
        ]
    },
    service: {
        type: String,
        required: true,
        default: 'microsoft_clarity'
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    ipAddress: {
        type: String,
        required: false
    },
    userAgent: {
        type: String,
        required: false
    },
    url: {
        type: String,
        required: false
    },
    consentVersion: {
        type: String,
        required: false,
        default: '1.0'
    },
    legalBasis: {
        type: String,
        required: false,
        enum: ['consent', 'legitimate_interest', 'legal_obligation', 'vital_interests', 'public_task', 'contract']
    },
    retentionDate: {
        type: Date,
        required: true,
        default: function() {
            // Default retention: 3 years from creation
            return new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000);
        }
    }
}, {
    timestamps: true,
    collection: 'gdpr_tracking_logs'
});

// Index for efficient querying
trackingLogSchema.index({ userId: 1, createdAt: -1 });
trackingLogSchema.index({ event: 1, createdAt: -1 });
trackingLogSchema.index({ retentionDate: 1 }); // For cleanup tasks

const TrackingLog = mongoose.model('TrackingLog', trackingLogSchema);

/**
 * POST /api/gdpr/tracking-log
 * Log tracking events for GDPR audit trail
 */
router.post('/tracking-log', async (req, res) => {
    try {
        const { event, data, timestamp, userAgent, url } = req.body;
        
        // Validate required fields
        if (!event) {
            return res.status(400).json({
                success: false,
                message: 'Event name is required'
            });
        }

        // Get user info if authenticated
        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                userId = decoded.userId;
            } catch (error) {
                // Continue without user ID if token is invalid
                console.log('Invalid token in tracking log request');
            }
        }

        // Get client IP (considering proxy headers)
        const ipAddress = req.headers['x-forwarded-for'] || 
                         req.headers['x-real-ip'] || 
                         req.connection.remoteAddress ||
                         req.socket.remoteAddress ||
                         (req.connection.socket ? req.connection.socket.remoteAddress : null);

        // Create tracking log entry
        const trackingLog = new TrackingLog({
            userId,
            sessionId: req.sessionID || null,
            event,
            service: data?.service || 'microsoft_clarity',
            data: {
                ...data,
                // Remove sensitive data
                userAgent: undefined,
                ipAddress: undefined
            },
            ipAddress: process.env.NODE_ENV === 'production' ? 
                      this.anonymizeIP(ipAddress) : ipAddress, // Anonymize in production
            userAgent,
            url,
            consentVersion: data?.consent_version || '1.0',
            legalBasis: this.determineLegalBasis(event)
        });

        await trackingLog.save();

        // Log for audit purposes
        console.log(`GDPR Tracking Log: ${event} - User: ${userId || 'Anonymous'} - Time: ${new Date().toISOString()}`);

        res.json({
            success: true,
            message: 'Tracking event logged successfully'
        });

    } catch (error) {
        console.error('Error logging tracking event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to log tracking event'
        });
    }
});

/**
 * GET /api/gdpr/tracking-logs
 * Get tracking logs for a user (authenticated users only)
 */
router.get('/tracking-logs', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { page = 1, limit = 50, event, service } = req.query;

        // Build query
        const query = { userId };
        if (event) query.event = event;
        if (service) query.service = service;

        // Get logs with pagination
        const logs = await TrackingLog.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('-__v -data.sensitive') // Exclude version and sensitive data
            .lean();

        const total = await TrackingLog.countDocuments(query);

        res.json({
            success: true,
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching tracking logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tracking logs'
        });
    }
});

/**
 * DELETE /api/gdpr/tracking-logs
 * Delete all tracking logs for a user (GDPR right to erasure)
 */
router.delete('/tracking-logs', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Delete all tracking logs for the user
        const result = await TrackingLog.deleteMany({ userId });

        // Log the deletion
        const deletionLog = new TrackingLog({
            userId,
            event: 'user_data_deleted',
            service: 'gdpr_compliance',
            data: {
                deletedLogs: result.deletedCount,
                reason: 'user_request_erasure'
            },
            legalBasis: 'legal_obligation'
        });
        await deletionLog.save();

        res.json({
            success: true,
            message: `${result.deletedCount} tracking logs deleted successfully`
        });

    } catch (error) {
        console.error('Error deleting tracking logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete tracking logs'
        });
    }
});

/**
 * GET /api/gdpr/tracking-export
 * Export all tracking data for a user (GDPR right to data portability)
 */
router.get('/tracking-export', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const format = req.query.format || 'json';

        // Get all tracking logs for the user
        const logs = await TrackingLog.find({ userId })
            .sort({ createdAt: -1 })
            .select('-__v')
            .lean();

        // Get user consent data
        const user = await User.findById(userId).select('gdprConsent');

        const exportData = {
            exportInfo: {
                userId,
                exportDate: new Date().toISOString(),
                dataController: 'SichrPlace',
                legalBasis: 'consent',
                retentionPeriod: '3 years'
            },
            consentData: user?.gdprConsent || null,
            trackingLogs: logs,
            summary: {
                totalLogs: logs.length,
                services: [...new Set(logs.map(log => log.service))],
                events: [...new Set(logs.map(log => log.event))],
                dateRange: {
                    earliest: logs.length > 0 ? logs[logs.length - 1].createdAt : null,
                    latest: logs.length > 0 ? logs[0].createdAt : null
                }
            }
        };

        if (format === 'csv') {
            // Convert to CSV format
            const csv = this.convertToCSV(logs);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="tracking-data-${userId}.csv"`);
            res.send(csv);
        } else {
            // Return as JSON
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="tracking-data-${userId}.json"`);
            res.json(exportData);
        }

        // Log the export
        const exportLog = new TrackingLog({
            userId,
            event: 'privacy_settings_accessed',
            service: 'gdpr_compliance',
            data: {
                action: 'data_export',
                format,
                recordsExported: logs.length
            },
            legalBasis: 'consent'
        });
        await exportLog.save();

    } catch (error) {
        console.error('Error exporting tracking data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export tracking data'
        });
    }
});

/**
 * Utility function to determine legal basis for tracking
 */
function determineLegalBasis(event) {
    const consentBasedEvents = ['clarity_initialized', 'consent_given'];
    const obligationBasedEvents = ['user_data_deleted', 'consent_withdrawn'];
    
    if (consentBasedEvents.includes(event)) {
        return 'consent';
    } else if (obligationBasedEvents.includes(event)) {
        return 'legal_obligation';
    } else {
        return 'legitimate_interest';
    }
}

/**
 * Utility function to anonymize IP addresses
 */
function anonymizeIP(ip) {
    if (!ip) return null;
    
    // IPv4 anonymization (remove last octet)
    if (ip.includes('.')) {
        const parts = ip.split('.');
        if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
        }
    }
    
    // IPv6 anonymization (remove last 64 bits)
    if (ip.includes(':')) {
        const parts = ip.split(':');
        if (parts.length >= 4) {
            return parts.slice(0, 4).join(':') + '::';
        }
    }
    
    return ip;
}

/**
 * Utility function to convert logs to CSV
 */
function convertToCSV(logs) {
    if (logs.length === 0) return 'No data available';
    
    const headers = ['Date', 'Event', 'Service', 'Legal Basis', 'URL'];
    const rows = logs.map(log => [
        log.createdAt,
        log.event,
        log.service,
        log.legalBasis || '',
        log.url || ''
    ]);
    
    return [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
}

/**
 * Cleanup task to remove expired tracking logs
 * Should be run as a scheduled job
 */
router.post('/cleanup-expired-logs', async (req, res) => {
    try {
        // Only allow this endpoint for admin users or scheduled tasks
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authorization required'
            });
        }

        // Delete logs past their retention date
        const result = await TrackingLog.deleteMany({
            retentionDate: { $lt: new Date() }
        });

        console.log(`Cleanup: ${result.deletedCount} expired tracking logs deleted`);

        res.json({
            success: true,
            message: `${result.deletedCount} expired tracking logs deleted`
        });

    } catch (error) {
        console.error('Error cleaning up expired logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup expired logs'
        });
    }
});

module.exports = router;
