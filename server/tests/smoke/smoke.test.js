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

describe('API smoke tests', () => {
  test('full happy-path smoke', async () => {
    // Register two users
    const a = await request(app)
      .post('/api/auth/register')
      .send({ username: 'smokeA', email: 'smokea@example.com', password: 'Password123!' });
    expect(a.status).toBe(200);
    const b = await request(app)
      .post('/api/auth/register')
      .send({ username: 'smokeB', email: 'smokeb@example.com', password: 'Password123!' });
    expect(b.status).toBe(200);

    const tokenA = a.body.accessToken;
    const tokenB = b.body.accessToken;
    const userA = a.body.user;
    const userB = b.body.user;

    // A creates a post
    const postRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'Smoke test post' });
    expect(postRes.status).toBe(201);
    const postId = postRes.body.post._id || postRes.body.post.id;

    // B comments on post
    const commentRes = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ content: 'Nice post from B' });
    expect([200, 201]).toContain(commentRes.status);
    const commentId = commentRes.body.comment
      ? commentRes.body.comment._id || commentRes.body.comment.id
      : null;

    // A likes the comment
    if (commentId) {
      const likeC = await request(app)
        .post(`/api/posts/${postId}/comments/${commentId}/like`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send();
      expect([200, 201]).toContain(likeC.status);
    }

    // A follows B
    const follow = await request(app)
      .post(`/api/users/${userB.id || userB._id}/follow`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send();
    expect([200, 201]).toContain(follow.status);

    // B sends message to A
    const msg = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ recipient: userA.id || userA._id, content: 'Hello from B' });
    expect([200, 201]).toContain(msg.status);

    // A fetches notifications
    const notifs = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(notifs.status).toBe(200);

    // Mark all read
    const markAll = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${tokenA}`)
      .send();
    expect(markAll.status).toBe(200);

    // Unfollow
    const unf = await request(app)
      .post(`/api/users/${userB.id || userB._id}/unfollow`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send();
    expect([200, 201]).toContain(unf.status);

    // Basic profile update for A
    const update = await request(app)
      .put(`/api/users/${userA.id || userA._id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ location: 'Earth' });
    expect([200, 201]).toContain(update.status);
  }, 30000);
});
