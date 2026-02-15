/**
 * Centralized error handling middleware for Express.
 * Logs the error and sends a generic error response.
 * If the error has a status code, use it; otherwise, default to 500.
 */
module.exports = (err, req, res, next) => {
  // Log error details for debugging
  console.error(`[${new Date().toISOString()}]`, err);

  // If response headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Use error status if set, otherwise default to 500
  const status = err.status || 500;

  // Handle express-validator validation errors
  if (err.errors) {
    return res.status(status).json({ errors: err.errors });
  }

  // Handle custom error messages
  if (err.message) {
    return res.status(status).json({ error: err.message });
  }

  // Fallback for unknown errors
  res.status(status).json({ error: 'Server error.' });
};