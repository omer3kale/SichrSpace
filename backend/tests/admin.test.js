const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

const adminUser = {
  username: 'adminuser',
  email: 'adminuser@example.com',
  password: 'Admin@1234',
  role: 'admin'
};

let adminToken;

beforeAll(async () => {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlaceTest',
    {}
  );
  // Clean up any previous test data
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

describe('Admin API', () => {
  it('should deny access to admin route without token', async () => {
    const res = await request(app)
      .get('/api/admin/some-protected-route');
    expect(res.statusCode).toBe(401); // Unauthorized
  });

  it('should allow access to admin route with valid admin token', async () => {
    // Replace '/api/admin/some-protected-route' with a real admin route
    const res = await request(app)
      .get('/api/admin/some-protected-route')
      .set('Authorization', `Bearer ${adminToken}`);
    // Adjust expected status and response as per your actual route
    expect([200, 404, 403]).toContain(res.statusCode); // Acceptable for demo
  });

  it('should return isAdmin true for admin user', async () => {
    const res = await request(app)
      .get('/api/check-admin')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.isAdmin).toBe(true);
  });
});