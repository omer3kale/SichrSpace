const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Apartment = require('../models/Apartment'); // Adjust path if needed

const testApartment = {
  title: 'Test Apartment',
  description: 'A test apartment for API testing.',
  address: '456 Test Ave, Test City',
  price: 1200,
  bedrooms: 1,
  bathrooms: 1,
  available_from: '2025-09-01'
};

beforeAll(async () => {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlaceTest',
    {}
  );
  await Apartment.deleteMany({ title: testApartment.title });
  await new Apartment(testApartment).save();
});

afterAll(async () => {
  await Apartment.deleteMany({ title: testApartment.title });
  await mongoose.connection.close();
});

describe('GET /api/apartments', () => {
  it('should return a list of all apartments', async () => {
    const res = await request(app)
      .get('/api/apartments');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some(a => a.title === testApartment.title)).toBe(true);
  });
});