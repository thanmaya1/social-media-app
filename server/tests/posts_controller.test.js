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

describe('PostController', () => {
  let token;

  beforeEach(async () => {
    // register a user and get token (use unique email per test)
    const uniq = Date.now() + Math.floor(Math.random() * 1000);
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: `puser${uniq}`,
        email: `puser${uniq}@example.com`,
        password: 'Password123!',
      });
    token = res.body.accessToken;
  });

  test('create post and get feed', async () => {
    const createRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .field('content', 'hello from test');

    expect(createRes.status).toBe(201);
    expect(createRes.body.post).toBeDefined();
    const feedRes = await request(app).get('/api/posts');
    expect(feedRes.status).toBe(200);
    expect(Array.isArray(feedRes.body.posts)).toBe(true);
  });

  test('like post toggles', async () => {
    const createRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .field('content', 'another post');

    const postId = createRes.body.post._id;
    const likeRes = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);
    expect(likeRes.status).toBe(200);
    expect(Array.isArray(likeRes.body.post.likes)).toBe(true);

    // toggle back
    const likeRes2 = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);
    expect(likeRes2.status).toBe(200);
  });
});
