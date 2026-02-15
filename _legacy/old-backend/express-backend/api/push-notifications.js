const express = require('express');
const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');
const auth = require('../middleware/auth');

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || (() => {
    console.error('SUPABASE_URL environment variable not set');
    process.exit(1);
})();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (() => {
    console.error('SUPABASE_SERVICE_ROLE_KEY environment variable not set');
    process.exit(1);
})();

const supabase = createClient(supabaseUrl, supabaseKey);

// Configure Web Push
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY || 'BMqS-rfcqwf8U6UmIQ4rD8fxe7BdBGE7RSrMgGHm7b2JGOvk3HSUIlIyXNDtxYuU1YOLswCcKB8Z3pL8_RqjzA8',
    privateKey: process.env.VAPID_PRIVATE_KEY || 'Q8cIHXBWmw5C44L7v8u8qF7fH3H8xBvM7xU8U8c8Q8c'
};

webpush.setVapidDetails(
    'mailto:' + (process.env.CONTACT_EMAIL || 'support@sichrplace.com'),
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

/**
 * @swagger
 * /api/push/vapid-public-key:
 *   get:
 *     summary: Get VAPID public key for push notifications
 *     tags: [Push Notifications]
 *     responses:
 *       200:
 *         description: VAPID public key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 publicKey:
 *                   type: string
 *                   description: VAPID public key for push subscription
 */
router.get('/vapid-public-key', (req, res) => {
    res.json({
        publicKey: vapidKeys.publicKey
    });
});

/**
 * @swagger
 * /api/push/subscribe:
 *   post:
 *     summary: Subscribe to push notifications
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscription
 *             properties:
 *               subscription:
 *                 type: object
 *                 properties:
 *                   endpoint:
 *                     type: string
 *                   keys:
 *                     type: object
 *                     properties:
 *                       p256dh:
 *                         type: string
 *                       auth:
 *                         type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully subscribed to push notifications
 *       400:
 *         description: Invalid subscription data
 *       401:
 *         description: Unauthorized
 */
router.post('/subscribe', auth, async (req, res) => {
    try {
        const { subscription, userId } = req.body;
        const userIdToUse = userId || req.user.id;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({
                error: 'Invalid subscription data'
            });
        }

        // Store subscription in database
        const { data, error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userIdToUse,
                endpoint: subscription.endpoint,
                p256dh_key: subscription.keys.p256dh,
                auth_key: subscription.keys.auth,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,endpoint'
            });

        if (error) {
            console.error('Error saving push subscription:', error);
            return res.status(500).json({
                error: 'Failed to save subscription'
            });
        }

        console.log('Push subscription saved for user:', userIdToUse);

        // Send welcome notification
        try {
            await sendNotification(subscription, {
                title: 'Welcome to SichrPlace!',
                body: 'You will now receive push notifications for new messages, viewing requests, and apartment alerts.',
                icon: '/img/pwa-icon-192.png',
                tag: 'welcome',
                data: {
                    type: 'welcome',
                    url: '/'
                }
            });
        } catch (welcomeError) {
            console.error('Failed to send welcome notification:', welcomeError);
            // Don't fail the subscription if welcome notification fails
        }

        res.json({
            success: true,
            message: 'Successfully subscribed to push notifications'
        });

    } catch (error) {
        console.error('Error subscribing to push notifications:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

/**
 * @swagger
 * /api/push/unsubscribe:
 *   post:
 *     summary: Unsubscribe from push notifications
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscription
 *             properties:
 *               subscription:
 *                 type: object
 *                 properties:
 *                   endpoint:
 *                     type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully unsubscribed from push notifications
 *       401:
 *         description: Unauthorized
 */
router.post('/unsubscribe', auth, async (req, res) => {
    try {
        const { subscription, userId } = req.body;
        const userIdToUse = userId || req.user.id;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({
                error: 'Invalid subscription data'
            });
        }

        // Remove subscription from database
        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userIdToUse)
            .eq('endpoint', subscription.endpoint);

        if (error) {
            console.error('Error removing push subscription:', error);
            return res.status(500).json({
                error: 'Failed to remove subscription'
            });
        }

        console.log('Push subscription removed for user:', userIdToUse);

        res.json({
            success: true,
            message: 'Successfully unsubscribed from push notifications'
        });

    } catch (error) {
        console.error('Error unsubscribing from push notifications:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

/**
 * @swagger
 * /api/push/send:
 *   post:
 *     summary: Send push notification to user
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - title
 *               - body
 *             properties:
 *               userId:
 *                 type: string
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [message, viewing_request, new_apartment, general]
 *               url:
 *                 type: string
 *               icon:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/send', auth, async (req, res) => {
    try {
        const { userId, title, body, type, url, icon, data } = req.body;

        if (!userId || !title || !body) {
            return res.status(400).json({
                error: 'Missing required fields: userId, title, body'
            });
        }

        // Get user's push subscriptions
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching push subscriptions:', error);
            return res.status(500).json({
                error: 'Failed to fetch subscriptions'
            });
        }

        if (!subscriptions || subscriptions.length === 0) {
            return res.status(404).json({
                error: 'No push subscriptions found for user'
            });
        }

        // Send notification to all user's devices
        const results = await Promise.allSettled(
            subscriptions.map(async (subscription) => {
                const pushSubscription = {
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: subscription.p256dh_key,
                        auth: subscription.auth_key
                    }
                };

                const notificationData = {
                    title,
                    body,
                    type: type || 'general',
                    icon: icon || '/img/pwa-icon-192.png',
                    tag: `${type || 'general'}-${Date.now()}`,
                    data: {
                        url: url || '/',
                        type: type || 'general',
                        timestamp: Date.now(),
                        ...data
                    }
                };

                return await sendNotification(pushSubscription, notificationData);
            })
        );

        // Check results and remove failed subscriptions
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const subscription = subscriptions[i];

            if (result.status === 'fulfilled') {
                successCount++;
            } else {
                failureCount++;
                console.error('Failed to send to subscription:', result.reason);

                // Remove invalid subscriptions
                if (result.reason && (
                    result.reason.statusCode === 410 || // Gone
                    result.reason.statusCode === 404    // Not Found
                )) {
                    await supabase
                        .from('push_subscriptions')
                        .delete()
                        .eq('id', subscription.id);
                    console.log('Removed invalid subscription:', subscription.id);
                }
            }
        }

        res.json({
            success: true,
            message: `Notification sent to ${successCount} device(s)`,
            results: {
                success: successCount,
                failed: failureCount,
                total: subscriptions.length
            }
        });

    } catch (error) {
        console.error('Error sending push notification:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

/**
 * @swagger
 * /api/push/send-bulk:
 *   post:
 *     summary: Send push notification to multiple users
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *               - title
 *               - body
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               type:
 *                 type: string
 *               url:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Bulk notification sent successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/send-bulk', auth, async (req, res) => {
    try {
        const { userIds, title, body, type, url, data } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                error: 'Invalid userIds array'
            });
        }

        if (!title || !body) {
            return res.status(400).json({
                error: 'Missing required fields: title, body'
            });
        }

        // Send notifications to all users
        const results = await Promise.allSettled(
            userIds.map(userId => 
                sendNotificationToUser(userId, {
                    title,
                    body,
                    type: type || 'general',
                    url: url || '/',
                    data
                })
            )
        );

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failureCount = results.filter(r => r.status === 'rejected').length;

        res.json({
            success: true,
            message: `Bulk notification sent to ${successCount} user(s)`,
            results: {
                success: successCount,
                failed: failureCount,
                total: userIds.length
            }
        });

    } catch (error) {
        console.error('Error sending bulk push notification:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Helper function to send notification
async function sendNotification(subscription, notificationData) {
    const payload = JSON.stringify(notificationData);
    
    const options = {
        TTL: 60 * 60 * 24, // 24 hours
        vapidDetails: {
            subject: 'mailto:' + (process.env.CONTACT_EMAIL || 'support@sichrplace.com'),
            publicKey: vapidKeys.publicKey,
            privateKey: vapidKeys.privateKey
        }
    };

    return await webpush.sendNotification(subscription, payload, options);
}

// Helper function to send notification to a specific user
async function sendNotificationToUser(userId, notificationData) {
    try {
        // Get user's push subscriptions
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId);

        if (error || !subscriptions || subscriptions.length === 0) {
            throw new Error(`No subscriptions found for user ${userId}`);
        }

        // Send to all user's devices
        const results = await Promise.allSettled(
            subscriptions.map(async (subscription) => {
                const pushSubscription = {
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: subscription.p256dh_key,
                        auth: subscription.auth_key
                    }
                };

                return await sendNotification(pushSubscription, notificationData);
            })
        );

        // Return summary
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        return { success: successCount, total: subscriptions.length };

    } catch (error) {
        console.error(`Error sending notification to user ${userId}:`, error);
        throw error;
    }
}

// Export helper functions for use in other modules
module.exports = router;
module.exports.sendNotificationToUser = sendNotificationToUser;
