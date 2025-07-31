const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const app = require('../server');
const User = require('../models/User');

const testUser = {
  username: 'apartmentowner',
  email: 'sichrplace@gmail.com',
  password: 'Test123!',
  role: 'landlord'
};

let userToken;

beforeAll(async () => {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlaceTest',
    {}
  );
  await User.deleteMany({ email: testUser.email });

  // Register and login user
  await request(app)
    .post('/api/auth/register')
    .send(testUser);

  const res = await request(app)
    .post('/api/auth/login')
    .send({ emailOrUsername: testUser.email, password: testUser.password });
  userToken = res.body.token;
});

afterAll(async () => {
  await User.deleteMany({ email: testUser.email });
  await mongoose.connection.close();
});

describe('POST /upload-apartment', () => {
  it('should upload a new apartment listing with authentication', async () => {
    const res = await request(app)
      .post('/upload-apartment')
      .set('Authorization', `Bearer ${userToken}`)
      .field('title', 'Modern Apartment in City Center')
      .field('description', 'A beautiful, modern apartment close to all amenities.')
      .field('address', '123 Main St, Metropolis')
      .field('price', 1500)
      .field('bedrooms', 2)
      .field('bathrooms', 1)
      .field('available_from', '2025-08-01')
      .attach('image', path.join(__dirname, 'fixtures', 'apartment.jpg')); // Make sure this file exists
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.apartment).toBeDefined();
    expect(res.body.apartment.title).toBe('Modern Apartment in City Center');
  });

  it('should fail to upload without authentication', async () => {
    const res = await request(app)
      .post('/upload-apartment')
      .field('title', 'Modern Apartment in City Center');
    expect([401, 403]).toContain(res.statusCode);
  });
});