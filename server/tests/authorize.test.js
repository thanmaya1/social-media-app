/* eslint-env jest */
/* eslint-disable node/no-unpublished-require */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { start, stop } = require('./util');
const { createApp } = require('../app');
const User = require('../models/User');

let app;

beforeAll(async () => {
  await start();
  app = createApp();
});

afterAll(async () => {
  await stop();
});

describe('RBAC authorize middleware', () => {
  test('blocks non-admin from admin route and allows admin', async () => {
    // create a normal user directly
    const user = await User.create({
      username: 'u1',
      email: 'u1@example.com',
      password: 'pw',
      roles: ['user'],
    });
    const tokenUser = jwt.sign(
      { id: user._id, roles: user.roles },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '1h' }
    );

    const res1 = await request(app)
      .get('/api/notifications/admin/stats')
      .set('Authorization', `Bearer ${tokenUser}`);
    expect([401, 403]).toContain(res1.status); // either Unauthorized or Forbidden depending on auth

    // create admin user
    const admin = await User.create({
      username: 'admin1',
      email: 'admin1@example.com',
      password: 'pw',
      roles: ['admin'],
    });
    const tokenAdmin = jwt.sign(
      { id: admin._id, roles: admin.roles },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '1h' }
    );

    const res2 = await request(app)
      .get('/api/notifications/admin/stats')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res2.status).toBe(200);
    expect(res2.body).toHaveProperty('total');
  });
});
