const { Handler } = require('@netlify/functions');

const handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    
    // Simulate viewing request processing
    const viewingRequest = {
      id: 'vr_' + Date.now(),
      apartmentId: body.apartmentId,
      preferredDate: body.preferredDate,
      alternativeDate: body.alternativeDate,
      message: body.message,
      tenantInfo: body.tenantInfo,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // In production, this would save to database
    console.log('Viewing request received:', viewingRequest);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Viewing request submitted successfully',
        requestId: viewingRequest.id,
        data: viewingRequest
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

module.exports = { handler };
