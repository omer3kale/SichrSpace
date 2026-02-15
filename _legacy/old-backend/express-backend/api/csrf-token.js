const express = require('express');
const router = express.Router();

/**
 * GET /api/csrf-token
 * Returns the CSRF token for the current session/request.
 * Requires lusca.csrf middleware to be active in server.js.
 */
router.get('/', (req, res) => {
  // For lusca, the CSRF token is available as req.csrfToken()
  if (typeof req.csrfToken === 'function') {
    try {
      const token = req.csrfToken();
      res.json({ csrfToken: token });
    } catch (err) {
      res.status(400).json({ error: 'CSRF protection is not enabled or token not available.' });
    }
  } else {
    res.status(400).json({ error: 'CSRF protection is not enabled or token not available.' });
  }
});

module.exports = router;