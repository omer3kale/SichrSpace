const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Message = require('../models/Message');
const User = require('../models/User');

const testUser = {
  username: 'msgreceiver',
  email: 'msgreceiver@example.com',
  password: 'MsgReceiver@1234'
};

let userToken;

beforeAll(async () => {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlaceTest',
    {}
  );
  await User.deleteMany({ email: testUser.email });
  await Message.deleteMany({ recipient: testUser.username });

  // Register and login user
  await request(app)
    .post('/api/auth/register')
    .send(testUser);

  const res = await request(app)
    .post('/api/auth/login')
    .send({ emailOrUsername: testUser.email, password: testUser.password });
  userToken = res.body.token;

  // Create a message for this user
  await new Message({
    sender: 'senderuser',
    recipient: testUser.username,
    content: 'Test message for retrieval'
  }).save();
});

afterAll(async () => {
  await Message.deleteMany({ recipient: testUser.username });
  await User.deleteMany({ email: testUser.email });
  await mongoose.connection.close();
});

describe('GET /api/messages/:username', () => {
  it('should fail to get messages without authentication', async () => {
    const res = await request(app)
      .get(`/api/messages/${testUser.username}`);
    expect([401, 403]).toContain(res.statusCode);
  });

  it('should retrieve messages for the user with authentication', async () => {
    const res = await request(app)
      .get(`/api/messages/${testUser.username}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some(msg => msg.recipient === testUser.username)).toBe(true);
  });

  it('should return an empty array for a user with no messages', async () => {
    const res = await request(app)
      .get('/api/messages/nonexistentuser')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
});