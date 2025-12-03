const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const appFactory = require('../app');
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
  // set a short scheduler poll interval env var used by utils/scheduler if present
  process.env.SCHEDULER_POLL_MS = '500';
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

describe('scheduler publish', () => {
  test('publishes scheduled post when time arrives', async () => {
    const now = Date.now();
    const scheduledAt = new Date(now + 700); // publish soon
    const p = await Post.create({ author: new mongoose.Types.ObjectId(), content: 'Scheduled', isDraft: true, scheduledAt });

    // Wait up to 3 seconds for scheduler to run and publish
    const waitFor = (ms) => new Promise((r) => setTimeout(r, ms));
    let published = false;
    for (let i = 0; i < 8; i++) {
      const fresh = await Post.findById(p._id);
      if (fresh && !fresh.isDraft) {
        published = true;
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await waitFor(500);
    }
    expect(published).toBe(true);
  }, 10000);
});
