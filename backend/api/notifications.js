const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabaseUrl = process.env.SUPABASE_URL || 'https://cgkumwtibknfrhyiicoo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (() => {
    console.error('SUPABASE_SERVICE_ROLE_KEY environment variable not set');
    process.exit(1);
})();
const supabase = createClient(supabaseUrl, supabaseKey);

// Auth middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Malformed token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fNcgmCwu7lIbCYoxUy3zbDNyWFpfjmJrUtLLAhPq+2mDNyN/p//FnxhSmTgvnp2Fh51+eJJKAIkqJnFu/xf93Q==');
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Notification types enum
const NOTIFICATION_TYPES = {
  VIEWING_REQUEST: 'viewing_request',
  VIEWING_APPROVED: 'viewing_approved',
  VIEWING_REJECTED: 'viewing_rejected',
  NEW_MESSAGE: 'new_message',
  FAVORITE_APARTMENT_UPDATED: 'favorite_apartment_updated',
  REVIEW_SUBMITTED: 'review_submitted',
  REVIEW_MODERATED: 'review_moderated',
  SAVED_SEARCH_ALERT: 'saved_search_alert',
  SYSTEM_ANNOUNCEMENT: 'system_announcement'
};

// GET /api/notifications - Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      unreadOnly = false, 
      limit = 20, 
      offset = 0,
      type 
    } = req.query;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (unreadOnly === 'true') {
      query = query.eq('is_read', false);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    res.json({
      success: true,
      data: data || [],
      unreadCount: unreadCount || 0,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
});

// POST /api/notifications - Create notification (internal use)
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      type,
      title,
      message,
      data = {},
      actionUrl,
      priority = 'normal'
    } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'userId, type, title, and message are required'
      });
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        type,
        title,
        message,
        data,
        action_url: actionUrl,
        priority,
        is_read: false
      }])
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Notification created successfully',
      data: notification[0]
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification'
    });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date() 
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: data[0]
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date() 
      })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) throw error;

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
});

// UTILITY FUNCTIONS FOR CREATING SPECIFIC NOTIFICATIONS

// Function to create viewing request notification
const createViewingRequestNotification = async (landlordId, apartmentTitle, requesterName) => {
  try {
    await supabase
      .from('notifications')
      .insert([{
        user_id: landlordId,
        type: NOTIFICATION_TYPES.VIEWING_REQUEST,
        title: 'New Viewing Request',
        message: `${requesterName} has requested to view your apartment "${apartmentTitle}"`,
        data: { apartmentTitle, requesterName },
        action_url: '/viewing-requests-dashboard.html',
        priority: 'high'
      }]);
  } catch (error) {
    console.error('Error creating viewing request notification:', error);
  }
};

// Function to create viewing approval notification
const createViewingApprovalNotification = async (requesterId, apartmentTitle, approvedDate) => {
  try {
    await supabase
      .from('notifications')
      .insert([{
        user_id: requesterId,
        type: NOTIFICATION_TYPES.VIEWING_APPROVED,
        title: 'Viewing Request Approved',
        message: `Your viewing request for "${apartmentTitle}" has been approved for ${approvedDate}`,
        data: { apartmentTitle, approvedDate },
        action_url: '/viewing-requests-dashboard.html',
        priority: 'high'
      }]);
  } catch (error) {
    console.error('Error creating viewing approval notification:', error);
  }
};

// Function to create favorite apartment update notification
const createFavoriteApartmentUpdateNotification = async (userId, apartmentTitle, updateType) => {
  try {
    await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        type: NOTIFICATION_TYPES.FAVORITE_APARTMENT_UPDATED,
        title: 'Favorite Apartment Updated',
        message: `Your favorite apartment "${apartmentTitle}" has been ${updateType}`,
        data: { apartmentTitle, updateType },
        action_url: '/apartments-listing.html',
        priority: 'normal'
      }]);
  } catch (error) {
    console.error('Error creating favorite apartment update notification:', error);
  }
};

// Function to create saved search alert notification
const createSavedSearchAlertNotification = async (userId, searchName, newApartmentsCount) => {
  try {
    await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        type: NOTIFICATION_TYPES.SAVED_SEARCH_ALERT,
        title: 'New Apartments Match Your Saved Search',
        message: `${newApartmentsCount} new apartments match your saved search "${searchName}"`,
        data: { searchName, newApartmentsCount },
        action_url: '/apartments-listing.html',
        priority: 'normal'
      }]);
  } catch (error) {
    console.error('Error creating saved search alert notification:', error);
  }
};

// Export utility functions
router.createViewingRequestNotification = createViewingRequestNotification;
router.createViewingApprovalNotification = createViewingApprovalNotification;
router.createFavoriteApartmentUpdateNotification = createFavoriteApartmentUpdateNotification;
router.createSavedSearchAlertNotification = createSavedSearchAlertNotification;

module.exports = router;
