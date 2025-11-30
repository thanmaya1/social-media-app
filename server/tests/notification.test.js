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

describe('Notifications API', () => {
  test('get notifications for authenticated user', async () => {
    // create a user via auth route
    const u1 = { username: 'notifuser', email: 'notif@example.com', password: 'Password123!' };
    const reg = await request(app).post('/api/auth/register').send(u1);
    expect(reg.status).toBe(200);
    const { accessToken } = reg.body;

    // create a second user to be sender
    const u2 = { username: 'sender', email: 'sender@example.com', password: 'Password123!' };
    const reg2 = await request(app).post('/api/auth/register').send(u2);
    expect(reg2.status).toBe(200);

    // create a notification directly
    await Notification.create({
      recipient: reg.body.user.id || reg.body.user?._id || reg.body.user,
      sender: reg2.body.user.id || reg2.body.user?._id || reg2.body.user,
      type: 'message',
      message: 'Hello!'
    });

    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('notifications');
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(res.body.notifications.length).toBeGreaterThanOrEqual(1);
  });
});
