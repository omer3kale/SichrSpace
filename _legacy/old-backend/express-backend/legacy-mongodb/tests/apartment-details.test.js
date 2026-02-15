const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Apartment = require('../models/Apartment'); // Adjust path if needed

const testApartment = {
  title: 'Unique Test Apartment',
  description: 'A unique test apartment for API testing.',
  address: '789 Unique Ave, Test City',
  price: 1800,
  bedrooms: 2,
  bathrooms: 2,
  available_from: '2025-10-01'
};

let apartmentId;

beforeAll(async () => {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlaceTest',
    {}
  );
  await Apartment.deleteMany({ title: testApartment.title });
  const created = await new Apartment(testApartment).save();
  apartmentId = created._id;
});

afterAll(async () => {
  await Apartment.deleteMany({ title: testApartment.title });
  await mongoose.connection.close();
});

describe('GET /api/apartments/:id', () => {
  it('should return details for a specific apartment', async () => {
    const res = await request(app)
      .get(`/api/apartments/${apartmentId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('title', testApartment.title);
    expect(res.body).toHaveProperty('address', testApartment.address);
    expect(res.body).toHaveProperty('price', testApartment.price);
  });

  it('should return 404 for a non-existent apartment', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/apartments/${fakeId}`);
    expect([404, 400]).toContain(res.statusCode);
  });
});