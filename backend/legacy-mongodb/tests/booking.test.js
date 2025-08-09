const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const BookingRequest = require('../models/BookingRequest');

const testBooking = {
  apartmentId: 'test-apartment-123',
  move_in: '2025-07-01',
  move_out: '2025-08-01',
  tenant_names: 'Jane Doe',
  reason: 'Relocation',
  habits: 'Non-smoker',
  payer: 'Jane Doe',
  profile_link: 'http://example.com/janedoe'
};

beforeAll(async () => {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlaceTest',
    {}
  );
  // Clean up any previous test data
  await BookingRequest.deleteMany({ apartmentId: testBooking.apartmentId });
});

afterAll(async () => {
  // Clean up test data and close connection
  await BookingRequest.deleteMany({ apartmentId: testBooking.apartmentId });
  await mongoose.connection.close();
});

describe('Booking API', () => {
  let bookingId;

  describe('POST /api/booking-request', () => {
    it('should fail with missing required fields', async () => {
      const res = await request(app)
        .post('/api/booking-request')
        .send({}); // Empty body
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should create a booking request with valid data', async () => {
      const res = await request(app)
        .post('/api/booking-request')
        .send(testBooking);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.booking.apartmentId).toBe(testBooking.apartmentId);
      bookingId = res.body.booking._id;
    });
  });

  describe('GET /api/booking-requests/:apartmentId', () => {
    it('should fetch booking requests for a valid apartment', async () => {
      const res = await request(app)
        .get(`/api/booking-requests/${testBooking.apartmentId}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].apartmentId).toBe(testBooking.apartmentId);
    });

    it('should return an empty array for an apartment with no bookings', async () => {
      const res = await request(app)
        .get('/api/booking-requests/nonexistent-apartment');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });
});