/* eslint-env jest */
/* eslint-disable node/no-unpublished-require */
const request = require('supertest');
const { start, stop } = require('./util');
const { createApp } = require('../app');
const Message = require('../models/Message');

let app;

beforeAll(async () => {
  await start();
  app = createApp();
});

afterAll(async () => {
  await stop();
});

describe('Messages API', () => {
  test('fetch messages between users and mark as read', async () => {
    const a = { username: 'alice', email: 'alice@example.com', password: 'Password123!' };
    const b = { username: 'bob', email: 'bob@example.com', password: 'Password123!' };

    const regA = await request(app).post('/api/auth/register').send(a);
    expect(regA.status).toBe(200);

    const regB = await request(app).post('/api/auth/register').send(b);
    expect(regB.status).toBe(200);
    const tokenB = regB.body.accessToken;

    // create a message from A -> B using the model
    const msg = await Message.create({ sender: regA.body.user.id, recipient: regB.body.user.id, content: 'Hi Bob' });

    // B fetches messages with A
    const res = await request(app).get(`/api/messages/${regA.body.user.id}`).set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
    expect(res.body.messages.length).toBeGreaterThanOrEqual(1);

    // B marks the message as read
    const mark = await request(app).put(`/api/messages/${msg._id}/read`).set('Authorization', `Bearer ${tokenB}`);
    expect(mark.status).toBe(200);
    expect(mark.body.ok).toBe(true);
    expect(mark.body.message).toHaveProperty('readAt');
  });
});
