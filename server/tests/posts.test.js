/* eslint-env jest */
/* eslint-disable node/no-unpublished-require */
const request = require('supertest');
const { start, stop } = require('./util');
const { createApp } = require('../app');

let app;

beforeAll(async () => {
  await start();
  app = createApp();
});

afterAll(async () => {
  await stop();
});

describe('Posts', () => {
  test('create and get feed', async () => {
    // register a user
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'puser', email: 'p@example.com', password: 'Password123!' });
    expect(reg.status).toBe(200);
    const token = reg.body.accessToken;

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .field('content', 'Hello from test');

    expect(res.status).toBe(201);
    expect(res.body.post).toHaveProperty('_id');
    expect(res.body.post.content).toBe('Hello from test');

    const feed = await request(app).get('/api/posts');
    expect(feed.status).toBe(200);
    expect(Array.isArray(feed.body.posts)).toBe(true);
    expect(feed.body.posts[0].content).toBe('Hello from test');
  });
});
