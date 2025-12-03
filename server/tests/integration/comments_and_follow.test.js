/* eslint-env jest */
/* eslint-disable node/no-unpublished-require */
const request = require('supertest');
const setup = require('../setup');
const { createApp } = require('../../app');

let app;

beforeAll(async () => {
  await setup.start();
  app = createApp();
});

afterAll(async () => {
  await setup.stop();
});

describe('Comments and Follow flows', () => {
  test('create post, comment, like comment, follow/unfollow', async () => {
    const a = await request(app)
      .post('/api/auth/register')
      .send({ username: 'cuser1', email: 'cuser1@example.com', password: 'Password123!' });
    const b = await request(app)
      .post('/api/auth/register')
      .send({ username: 'cuser2', email: 'cuser2@example.com', password: 'Password123!' });
    const tokenA = a.body.accessToken;
    const tokenB = b.body.accessToken;

    // create post by A
    const postRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'Hello world' });
    expect(postRes.status).toBe(201);
    const postId = postRes.body.post._id || postRes.body.post.id || postRes.body.post;

    // create comment by B
    const commentRes = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ content: 'Nice post' });
    expect(commentRes.status).toBe(201);
    const commentId = commentRes.body.comment._id || commentRes.body.comment.id;

    // like comment
    const likeRes = await request(app)
      .post(`/api/posts/${postId}/comments/${commentId}/like`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send();
    expect([200, 201]).toContain(likeRes.status);

    // follow/unfollow B by A
    const followRes = await request(app)
      .post(`/api/users/${b.body.user.id || b.body.user._id}/follow`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send();
    expect([200, 201]).toContain(followRes.status);
    const unfRes = await request(app)
      .post(`/api/users/${b.body.user.id || b.body.user._id}/unfollow`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send();
    expect([200, 201]).toContain(unfRes.status);
  }, 20000);
});
