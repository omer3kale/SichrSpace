const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

const testUser = {
  username: 'testuser',
  email: 'sichrplace@gmail.com',
  password: 'Test123!',
  role: 'tenant'
};

beforeAll(async () => {
  // Connect to the test database
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlaceTest',
    { }
  );
});

afterAll(async () => {
  // Clean up test user and close connection
  await User.deleteOne({ email: testUser.email });
  await mongoose.connection.close();
});

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should fail with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: '', email: '', password: '' });
      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      expect(res.statusCode).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should not allow duplicate registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      expect(res.statusCode).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should fail with wrong credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ emailOrUsername: 'wronguser', password: 'wrongpass' });
      expect(res.statusCode).toBe(401);
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ emailOrUsername: testUser.email, password: testUser.password });
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
    });
  });
});