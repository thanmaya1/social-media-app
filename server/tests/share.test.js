const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const appFactory = require('../app');
const User = require('../models/User');
const Post = require('../models/Post');

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

describe('POST /api/posts/:id/share', () => {
  test('increments share count and optionally creates a copy', async () => {
    const user = await User.create({ username: 'u1', email: 'u1@example.com', password: 'x' });
    const other = await User.create({ username: 'u2', email: 'u2@example.com', password: 'x' });

    const post = await Post.create({ author: other._id, content: 'Hello world', visibility: 'public' });

    // mock auth middleware by signing a simple JWT with ACCESS_TOKEN_SECRET
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: user._id, roles: [] }, process.env.ACCESS_TOKEN_SECRET || 'testsecret');

    const res = await request(app)
      .post(`/api/posts/${post._id}/share`)
      .set('Authorization', `Bearer ${token}`)
      .send({ createCopy: true, content: 'Nice post' })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.post).toBeTruthy();

    const updated = await Post.findById(post._id);
    expect(updated.shares).toBe(1);

    const shared = await Post.findById(res.body.post._id);
    expect(shared).toBeTruthy();
    expect(shared.author.toString()).toBe(user._id.toString());
  });
});
