const request = require('supertest');
const app = require('../server');

describe('GET /api/csrf-token', () => {
  it('should return a csrfToken if CSRF is enabled', async () => {
    // This test only passes if ENABLE_CSRF=true in your environment
    const res = await request(app).get('/api/csrf-token');
    if (process.env.ENABLE_CSRF === 'true') {
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('csrfToken');
      expect(typeof res.body.csrfToken).toBe('string');
    } else {
      // If CSRF is disabled, expect 404 or similar (adjust as needed)
      expect([404, 403]).toContain(res.statusCode);
    }
  });
});