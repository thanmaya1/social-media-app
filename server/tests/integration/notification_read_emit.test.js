/* eslint-env jest */
/* eslint-disable node/no-unpublished-require */
const request = require('supertest');
const setup = require('../setup');
const { createApp } = require('../../app');
const Notification = require('../../models/Notification');
const notificationService = require('../../utils/notificationService');

let app;

beforeAll(async () => {
  await setup.start();
  app = createApp();
});

afterAll(async () => {
  await setup.stop();
});

describe('Notification read emits', () => {
  test('marking a notification read emits notification_read to user room', async () => {
    // create users
    const u1 = await request(app)
      .post('/api/auth/register')
      .send({ username: 'nreader', email: 'nreader@example.com', password: 'Password123!' });
    const u2 = await request(app)
      .post('/api/auth/register')
      .send({ username: 'nrecipient', email: 'nrecipient@example.com', password: 'Password123!' });
    const sender = u1.body.user;
    const recipient = u2.body.user;

    // create a notification via service
    const created = await notificationService.createNotification({
      recipient: recipient.id || recipient._id,
      sender: sender.id || sender._id,
      type: 'system',
      message: 'hi',
      force: true,
    });

    // mock io
    const emitSpy = jest.fn();
    const mockIo = { to: () => ({ emit: emitSpy }) };
    app.set('io', mockIo);

    // mark read as the recipient
    const token = u2.body.accessToken;
    const res = await request(app)
      .put(`/api/notifications/${created._id}/read`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(res.status).toBe(200);

    // should emit notification_read
    expect(emitSpy).toHaveBeenCalledWith('notification_read', { id: created._id.toString() });
  });
});
