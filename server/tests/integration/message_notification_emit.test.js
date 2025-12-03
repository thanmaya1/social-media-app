/* eslint-env jest */
/* eslint-disable node/no-unpublished-require */
const request = require('supertest');
const setup = require('../setup');
const { createApp } = require('../../app');
const Notification = require('../../models/Notification');

let app;

beforeAll(async () => {
  await setup.start();
  app = createApp();
});

afterAll(async () => {
  await setup.stop();
});

describe('Message -> Notification emit', () => {
  test('sending a message creates a notification and emits realtime event', async () => {
    // create recipient
    const u1 = await request(app)
      .post('/api/auth/register')
      .send({ username: 'sender1', email: 'sender1@example.com', password: 'Password123!' });
    const u2 = await request(app)
      .post('/api/auth/register')
      .send({ username: 'recipient1', email: 'recipient1@example.com', password: 'Password123!' });
    const recipient = u2.body.user;

    // mock io and onlineUsers map on the app so controller emits to our spy
    const emitSpy = jest.fn();
    const mockIo = { to: () => ({ emit: emitSpy }) };
    app.set('io', mockIo);
    app.set('onlineUsers', new Map([[recipient.id || recipient._id, 'sock123']]));

    // send message
    const token = u1.body.accessToken;
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipient: recipient.id || recipient._id, content: 'hello' });
    expect(res.status).toBe(201);

    // notification should exist
    const n = await Notification.findOne({ recipient: recipient.id || recipient._id });
    expect(n).toBeTruthy();
    // our mock emit should have been called
    expect(emitSpy).toHaveBeenCalled();
  });
});
