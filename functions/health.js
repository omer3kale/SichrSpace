const { Handler } = require('@netlify/functions');

const handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'SichrPlace API',
      environment: process.env.NODE_ENV || 'production',
      version: '1.0.0'
    })
  };
};

module.exports = { handler };
