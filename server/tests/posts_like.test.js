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

describe('Post like/unlike', () => {
  test('toggle like on a post', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'liker', email: 'liker@example.com', password: 'Password123!' });
    expect(reg.status).toBe(200);
    const token = reg.body.accessToken;

    const create = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .field('content', 'Like test post');
    expect(create.status).toBe(201);
    const postId = create.body.post._id;

    // like
    const likeRes = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);
    expect(likeRes.status).toBe(200);
    expect(Array.isArray(likeRes.body.post.likes)).toBe(true);
    expect(likeRes.body.post.likes.length).toBe(1);

    // unlike (toggle)
    const unlikeRes = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);
    expect(unlikeRes.status).toBe(200);
    expect(Array.isArray(unlikeRes.body.post.likes)).toBe(true);
    expect(unlikeRes.body.post.likes.length).toBe(0);
  });
});
