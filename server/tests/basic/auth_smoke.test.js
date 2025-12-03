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

describe('Auth smoke', () => {
  test('register and fetch profile', async () => {
    const u = { username: 'smokeuser', email: 'smoke@example.com', password: 'Password123!' };
    const reg = await request(app).post('/api/auth/register').send(u);
    expect(reg.status).toBe(200);
    const token = reg.body.accessToken;

    const profile = await request(app).get('/api/profile').set('Authorization', `Bearer ${token}`);
    expect(profile.status).toBe(200);
    expect(profile.body).toHaveProperty('user');
    expect(profile.body.user).toHaveProperty('username');
    expect(profile.body.user.username).toBe(u.username);
  });
});
