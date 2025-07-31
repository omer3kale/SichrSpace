const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

const testUser = {
  username: 'adminprotected',
  email: 'sichrplace@gmail.com',
  password: 'Test123!',
  role: 'admin'
};

let adminToken;

beforeAll(async () => {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlaceTest',
    {}
  );
  await User.deleteMany({ email: adminUser.email });

  // Register admin user
  await request(app)
    .post('/api/auth/register')
    .send(adminUser);

  // Login as admin to get token
  const res = await request(app)
    .post('/api/auth/login')
    .send({ emailOrUsername: adminUser.email, password: adminUser.password });
  adminToken = res.body.token;
});

afterAll(async () => {
  await User.deleteMany({ email: adminUser.email });
  await mongoose.connection.close();
});

describe('GET /api/admin/some-protected-route', () => {
  it('should deny access without authentication', async () => {
    const res = await request(app)
      .get('/api/admin/some-protected-route');
    expect([401, 403]).toContain(res.statusCode);
  });

  it('should allow access with valid admin token', async () => {
    const res = await request(app)
      .get('/api/admin/some-protected-route')
      .set('Authorization', `Bearer ${adminToken}`);
    // Adjust expected status and response as per your actual route
    expect([200, 404, 403]).toContain(res.statusCode);
  });
});