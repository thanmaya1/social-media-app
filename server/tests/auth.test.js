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

describe('Auth', () => {
  test('register -> login flow', async () => {
    const username = 'testuser';
    const email = 'test@example.com';
    const password = 'Password123!';

    const reg = await request(app).post('/api/auth/register').send({ username, email, password });
    expect(reg.status).toBe(200);
    expect(reg.body).toHaveProperty('accessToken');
    expect(reg.body).toHaveProperty('refreshToken');

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body).toHaveProperty('accessToken');
  });
});
