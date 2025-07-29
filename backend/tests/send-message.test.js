const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Message = require('../models/Message');
const User = require('../models/User');

const testUser = {
  username: 'msgsender',
  email: 'msgsender@example.com',
  password: 'MsgSender@1234'
};

let userToken;

beforeAll(async () => {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlaceTest',
    {}
  );
  await User.deleteMany({ email: testUser.email });
  await Message.deleteMany({ sender: testUser.username });

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
  await Message.deleteMany({ sender: testUser.username });
  await User.deleteMany({ email: testUser.email });
  await mongoose.connection.close();
});

describe('POST /api/send-message', () => {
  const messageData = {
    sender: testUser.username,
    recipient: 'recipientuser',
    content: 'Hello, this is a test message!'
  };

  it('should fail to send a message without authentication', async () => {
    const res = await request(app)
      .post('/api/send-message')
      .send(messageData);
    expect([401, 403]).toContain(res.statusCode);
  });

  it('should send a message with authentication', async () => {
    const res = await request(app)
      .post('/api/send-message')
      .set('Authorization', `Bearer ${userToken}`)
      .send(messageData);
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.message).toBeDefined();
    expect(res.body.message.sender).toBe(testUser.username);
    expect(res.body.message.recipient).toBe(messageData.recipient);
    expect(res.body.message.content).toBe(messageData.content);
  });
});