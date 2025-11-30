/* eslint-env jest */
/* eslint-disable node/no-unpublished-require */
const request = require('supertest');
const { start, stop } = require('./util');
const { createApp } = require('../app');
const Notification = require('../models/Notification');

let app;

beforeAll(async () => {
  await start();
  app = createApp();
});

afterAll(async () => {
  await stop();
});

describe('Notification Controller', () => {
  test('markRead forbids when not owner and returns 404 when missing', async () => {
    // register two users
    const a = { username: 'nowner', email: 'nowner@example.com', password: 'Password123!' };
    const b = { username: 'nother', email: 'nother@example.com', password: 'Password123!' };

    const regA = await request(app).post('/api/auth/register').send(a);
    expect(regA.status).toBe(200);
    const tokenA = regA.body.accessToken;

    const regB = await request(app).post('/api/auth/register').send(b);
    expect(regB.status).toBe(200);
    const tokenB = regB.body.accessToken;

    // create a notification for A (use allowed enum types)
    const n = await Notification.create({ recipient: regA.body.user.id, sender: regB.body.user.id, type: 'message', message: 'hello' });

    // B tries to mark A's notification as read -> 403
    const resForbidden = await request(app)
      .put(`/api/notifications/${n._id}/read`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resForbidden.status).toBe(403);

    // try marking non-existent id -> 404
    const resNotFound = await request(app)
      .put(`/api/notifications/000000000000000000000000/read`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(resNotFound.status).toBe(404);
  });

  test('markAllRead and unreadCount work', async () => {
    const u = { username: 'ncount', email: 'ncount@example.com', password: 'Password123!' };
    const reg = await request(app).post('/api/auth/register').send(u);
    expect(reg.status).toBe(200);
    const token = reg.body.accessToken;
    const userId = reg.body.user.id;

    // create several notifications using allowed types
    await Notification.create({ recipient: userId, sender: userId, type: 'message', message: '1' });
    await Notification.create({ recipient: userId, sender: userId, type: 'system', message: '2', read: true });
    await Notification.create({ recipient: userId, sender: userId, type: 'follow', message: '3' });

    // unread count should be 2
    const countRes = await request(app).get('/api/notifications/unread-count').set('Authorization', `Bearer ${token}`);
    expect(countRes.status).toBe(200);
    expect(countRes.body.unread).toBe(2);

    // mark all read
    const markAll = await request(app).put('/api/notifications/read-all').set('Authorization', `Bearer ${token}`);
    expect(markAll.status).toBe(200);

    // unread should be 0 now
    const countRes2 = await request(app).get('/api/notifications/unread-count').set('Authorization', `Bearer ${token}`);
    expect(countRes2.status).toBe(200);
    expect(countRes2.body.unread).toBe(0);
  });
});
