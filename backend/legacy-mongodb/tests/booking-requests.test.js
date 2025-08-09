const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const BookingRequest = require('../models/BookingRequest');

const testApartmentId = 'apartment-test-456';
const testBooking = {
  apartmentId: testApartmentId,
  move_in: '2025-09-01',
  move_out: '2025-10-01',
  tenant_names: 'Sam Example',
  reason: 'Vacation',
  habits: 'Non-smoker',
  payer: 'Sam Example',
  profile_link: 'https://linkedin.com/in/samexample'
};

beforeAll(async () => {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlaceTest',
    {}
  );
  await BookingRequest.deleteMany({ apartmentId: testApartmentId });
// Create a booking request for testing retrieval
await new BookingRequest(testBooking).save();
  await new BookingRequest(testBooking).save();
});

afterAll(async () => {
  await BookingRequest.deleteMany({ apartmentId: testApartmentId });
  await mongoose.connection.close();
});

describe('GET /api/booking-requests/:apartmentId', () => {
  it('should return all booking requests for a valid apartmentId', async () => {
    const res = await request(app)
      .get(`/api/booking-requests/${testApartmentId}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].apartmentId).toBe(testApartmentId);
  });

  it('should return an empty array for an apartmentId with no bookings', async () => {
    const res = await request(app)
      .get('/api/booking-requests/nonexistent-apartment');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
});