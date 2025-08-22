const { Handler } = require('@netlify/functions');

const handler = async (event, context) => {
  try {
    // PayPal configuration
    const paypalConfig = {
      clientId: process.env.PAYPAL_CLIENT_ID || 'AcPYlXozR8VS9kJSk7rv5MW36lMV66ZMyqZKjM0YVuvt0dJ1cIyHRvDmGeux0qu3gBOh6XswI5gin2WO',
      environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
      currency: 'EUR',
      locale: 'en_DE'
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({
        success: true,
        config: paypalConfig
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
