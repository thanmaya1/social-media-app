/* eslint-env jest */
/* eslint-disable node/no-unpublished-require */
const request = require('supertest');
const { start, stop } = require('../util');
const { createApp } = require('../../app');

let app;

beforeAll(async () => {
  await start();
  app = createApp();
});

afterAll(async () => {
  await stop();
});

describe('Messages search', () => {
  test('search returns matching messages', async () => {
    const a = { username: 'msga', email: 'msga@example.com', password: 'Password123!' };
    const b = { username: 'msgb', email: 'msgb@example.com', password: 'Password123!' };
    const regA = await request(app).post('/api/auth/register').send(a);
    const regB = await request(app).post('/api/auth/register').send(b);
    const tokenA = regA.body.accessToken;

    // send a few messages from A to B
    await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipient: regB.body.user.id, content: 'hello world' });
    await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipient: regB.body.user.id, content: 'another message about apples' });

    // search for 'apples' as A
    const res = await request(app)
      .get('/api/messages/search')
      .set('Authorization', `Bearer ${tokenA}`)
      .query({ q: 'apples', limit: 20 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
    expect(res.body.messages.length).toBeGreaterThanOrEqual(1);
    expect(res.body.messages.some((m) => /apples/i.test(m.content))).toBe(true);
  });
});
/* eslint-env jest */
/* eslint-disable node/no-unpublished-require */
const request = require('supertest');
const { start, stop } = require('../util');
const { createApp } = require('../../app');

let app;

beforeAll(async () => {
  await start();
  app = createApp();
});

afterAll(async () => {
  await stop();
});

describe('Messages search', () => {
  test('send message and find via search', async () => {
    const u1 = { username: 'msender', email: 'msender@example.com', password: 'Password123!' };
    const u2 = { username: 'mrecv', email: 'mrecv@example.com', password: 'Password123!' };

    const r1 = await request(app).post('/api/auth/register').send(u1);
    expect(r1.status).toBe(200);
    const token1 = r1.body.accessToken;

    const r2 = await request(app).post('/api/auth/register').send(u2);
    expect(r2.status).toBe(200);
    const user2 = r2.body.user;

    // send a message from u1 to u2
    const sendRes = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token1}`)
      .send({ recipient: user2.id || user2._id, content: 'find-me-12345' });
    expect([200, 201]).toContain(sendRes.status);

    // search as sender
    const searchRes = await request(app)
      .get('/api/messages/search')
      .set('Authorization', `Bearer ${token1}`)
      .query({ q: 'find-me-12345' });
    expect(searchRes.status).toBe(200);
    expect(Array.isArray(searchRes.body.messages)).toBe(true);
    expect(searchRes.body.messages.length).toBeGreaterThanOrEqual(1);
  });
});
