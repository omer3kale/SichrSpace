const express = require('express');
const router = express.Router();
const ViewingRequestService = require('../services/ViewingRequestService');
const EmailService = require('../services/emailService');
const auth = require('../middleware/auth');

// Initialize email service
const emailService = new EmailService();

// GET /api/viewing-requests - List viewing requests with filters
router.get('/', auth, async (req, res) => {
  try {
    const {
      status,
      payment_status,
      apartment_id,
      date_from,
      date_to,
      limit = 20,
      offset = 0
    } = req.query;

    const options = {
      status,
      paymentStatus: payment_status,
      apartmentId: apartment_id,
      dateFrom: date_from,
      dateTo: date_to,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    // Remove undefined values
    Object.keys(options).forEach(key => 
      options[key] === undefined && delete options[key]
    );

    const viewingRequests = await ViewingRequestService.list(options);
    
    res.json({
      success: true,
      data: viewingRequests,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: viewingRequests.length
      }
    });
  } catch (error) {
    console.error('Error fetching viewing requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch viewing requests'
    });
  }
});

// GET /api/viewing-requests/my-requests - Get current user's viewing requests (as tenant)
router.get('/my-requests', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const viewingRequests = await ViewingRequestService.findByRequester(userId);
    
    res.json({
      success: true,
      data: viewingRequests,
      count: viewingRequests.length
    });
  } catch (error) {
    console.error('Error fetching user viewing requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch your viewing requests'
    });
  }
});

// GET /api/viewing-requests/my-properties - Get viewing requests for current user's properties (as landlord)
router.get('/my-properties', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const viewingRequests = await ViewingRequestService.findByLandlord(userId);
    
    res.json({
      success: true,
      data: viewingRequests,
      count: viewingRequests.length
    });
  } catch (error) {
    console.error('Error fetching property viewing requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch viewing requests for your properties'
    });
  }
});

// GET /api/viewing-requests/statistics - Get viewing request statistics
router.get('/statistics', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await ViewingRequestService.getStatistics(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching viewing request statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// GET /api/viewing-requests/:id - Get specific viewing request
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const viewingRequest = await ViewingRequestService.findById(id);
    
    if (!viewingRequest) {
      return res.status(404).json({
        success: false,
        error: 'Viewing request not found'
      });
    }

    // Check if user has permission to view this request
    const userId = req.user.id;
    if (viewingRequest.requester_id !== userId && 
        viewingRequest.landlord_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: viewingRequest
    });
  } catch (error) {
    console.error('Error fetching viewing request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch viewing request'
    });
  }
});

// POST /api/viewing-requests - Create new viewing request
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Validate required fields
    const {
      apartment_id,
      requested_date,
      message,
      phone,
      booking_fee = 25.00
    } = req.body;

    if (!apartment_id || !requested_date) {
      return res.status(400).json({
        success: false,
        error: 'Apartment ID and requested date are required'
      });
    }

    // Create viewing request data structure for Supabase
    const requestData = {
      apartment_id,
      requester_id: userId,
      landlord_id: req.body.landlord_id, // This should come from apartment data
      requested_date,
      alternative_date_1: req.body.alternative_date_1,
      alternative_date_2: req.body.alternative_date_2,
      message,
      phone,
      email: req.user.email,
      booking_fee,
      status: 'pending',
      payment_status: 'pending'
    };

    const viewingRequest = await ViewingRequestService.create(requestData);

    // Prepare user data for email
    const userData = {
      firstName: req.user.first_name || req.user.username || 'there',
      apartmentAddress: req.body.apartment_address || 'Details being processed',
      requestId: viewingRequest.id
    };

    // Send Email #1: Request Confirmation
    const emailResult = await emailService.sendRequestConfirmation(
      req.user.email,
      userData
    );

    if (emailResult.success) {
      console.log(`✅ Request confirmation email sent to ${req.user.email}`);
    } else {
      console.error(`❌ Failed to send request confirmation email: ${emailResult.error}`);
    }

    res.status(201).json({ 
      success: true, 
      data: viewingRequest,
      emailSent: emailResult.success,
      message: 'Viewing request created successfully'
    });
  } catch (error) {
    console.error('Error creating viewing request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create viewing request'
    });
  }
});

// PUT /api/viewing-requests/:id - Update viewing request
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // First, get the existing viewing request to check permissions
    const existingRequest = await ViewingRequestService.findById(id);
    
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        error: 'Viewing request not found'
      });
    }

    // Check if user has permission to update this request
    if (existingRequest.requester_id !== userId && 
        existingRequest.landlord_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Filter allowed fields based on user role
    let allowedFields = [];
    if (existingRequest.requester_id === userId) {
      // Requester can update these fields
      allowedFields = ['requested_date', 'alternative_date_1', 'alternative_date_2', 'message', 'phone'];
    } else if (existingRequest.landlord_id === userId) {
      // Landlord can update these fields
      allowedFields = ['status', 'confirmed_date', 'notes'];
    }

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const updatedRequest = await ViewingRequestService.update(id, updateData);
    
    res.json({
      success: true,
      data: updatedRequest,
      message: 'Viewing request updated successfully'
    });
  } catch (error) {
    console.error('Error updating viewing request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update viewing request'
    });
  }
});

// PATCH /api/viewing-requests/:id/approve - Approve viewing request
router.patch('/:id/approve', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmed_date } = req.body;
    const userId = req.user.id;

    // Get the viewing request to check permissions
    const viewingRequest = await ViewingRequestService.findById(id);
    
    if (!viewingRequest) {
      return res.status(404).json({
        success: false,
        error: 'Viewing request not found'
      });
    }

    // Only landlord can approve
    if (viewingRequest.landlord_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the property owner can approve viewing requests'
      });
    }

    const updatedRequest = await ViewingRequestService.approve(id, confirmed_date);
    
    // TODO: Send approval notification email
    
    res.json({
      success: true,
      data: updatedRequest,
      message: 'Viewing request approved successfully'
    });
  } catch (error) {
    console.error('Error approving viewing request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve viewing request'
    });
  }
});

// PATCH /api/viewing-requests/:id/reject - Reject viewing request
router.patch('/:id/reject', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    // Get the viewing request to check permissions
    const viewingRequest = await ViewingRequestService.findById(id);
    
    if (!viewingRequest) {
      return res.status(404).json({
        success: false,
        error: 'Viewing request not found'
      });
    }

    // Only landlord can reject
    if (viewingRequest.landlord_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the property owner can reject viewing requests'
      });
    }

    const updatedRequest = await ViewingRequestService.reject(id, reason);
    
    // TODO: Send rejection notification email
    
    res.json({
      success: true,
      data: updatedRequest,
      message: 'Viewing request rejected'
    });
  } catch (error) {
    console.error('Error rejecting viewing request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject viewing request'
    });
  }
});

// PATCH /api/viewing-requests/:id/complete - Mark viewing request as completed
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get the viewing request to check permissions
    const viewingRequest = await ViewingRequestService.findById(id);
    
    if (!viewingRequest) {
      return res.status(404).json({
        success: false,
        error: 'Viewing request not found'
      });
    }

    // Only landlord can mark as completed
    if (viewingRequest.landlord_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the property owner can mark viewing as completed'
      });
    }

    const updatedRequest = await ViewingRequestService.complete(id);
    
    res.json({
      success: true,
      data: updatedRequest,
      message: 'Viewing request marked as completed'
    });
  } catch (error) {
    console.error('Error completing viewing request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete viewing request'
    });
  }
});

// PATCH /api/viewing-requests/:id/payment - Update payment status
router.patch('/:id/payment', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_id } = req.body;
    const userId = req.user.id;

    // Get the viewing request to check permissions
    const viewingRequest = await ViewingRequestService.findById(id);
    
    if (!viewingRequest) {
      return res.status(404).json({
        success: false,
        error: 'Viewing request not found'
      });
    }

    // Only requester can update payment status
    if (viewingRequest.requester_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const updatedRequest = await ViewingRequestService.updatePaymentStatus(id, payment_status, payment_id);
    
    res.json({
      success: true,
      data: updatedRequest,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment status'
    });
  }
});

// DELETE /api/viewing-requests/:id - Cancel viewing request
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get the viewing request to check permissions
    const viewingRequest = await ViewingRequestService.findById(id);
    
    if (!viewingRequest) {
      return res.status(404).json({
        success: false,
        error: 'Viewing request not found'
      });
    }

    // Only requester can cancel their own request
    if (viewingRequest.requester_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the requester can cancel their viewing request'
      });
    }

    // If already approved or completed, don't allow cancellation
    if (['approved', 'completed'].includes(viewingRequest.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel an approved or completed viewing request'
      });
    }

    await ViewingRequestService.cancel(id);
    
    res.json({
      success: true,
      message: 'Viewing request cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling viewing request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel viewing request'
    });
  }
});

module.exports = router;
