const crypto = require('crypto');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Generate CSRF token
    const csrfToken = crypto.randomBytes(32).toString('hex');
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': `csrfToken=${csrfToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`
      },
      body: JSON.stringify({ csrfToken })
    };
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
