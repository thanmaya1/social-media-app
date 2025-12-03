const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const appFactory = require('../app');
const User = require('../models/User');
const Message = require('../models/Message');

let mongod;
let app;
beforeAll(async () => {
  // ensure secrets and redis disabled for tests
  process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'testsecret';
  process.env.REDIS_URL = '';
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  app = appFactory.createApp();
});

afterAll(async () => {
  try {
    const scheduler = require('../utils/scheduler');
    if (scheduler && scheduler.stopScheduler) scheduler.stopScheduler();
  } catch (e) {
    // ignore
  }
  await mongoose.disconnect();
  await mongod.stop();
});

describe('GET /api/conversations/:conversationId/search', () => {
  test('searches messages between two participants', async () => {
    const a = await User.create({ username: 'a', email: 'a@example.com', password: 'x' });
    const b = await User.create({ username: 'b', email: 'b@example.com', password: 'x' });

    await Message.create({ sender: a._id, recipient: b._id, content: 'This is a secret', type: 'text' });
    await Message.create({ sender: b._id, recipient: a._id, content: 'Nothing to see here', type: 'text' });

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: a._id, roles: [] }, process.env.ACCESS_TOKEN_SECRET || 'testsecret');

    const res = await request(app)
      .get(`/api/conversations/${b._id}/search?q=secret`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.messages).toBeTruthy();
    expect(res.body.messages.length).toBeGreaterThanOrEqual(1);
    expect(res.body.messages[0].content).toMatch(/secret/i);
  });
});
