const request = require('supertest');
const jwt = require('jsonwebtoken');
const setup = require('./setup');
const { createApp } = require('../app');
const User = require('../models/User');
const Post = require('../models/Post');
const Report = require('../models/Report');

describe('Admin resolve report', () => {
  let app;
  beforeAll(async () => {
    await setup.start();
    app = createApp();
  });

  afterAll(async () => {
    await setup.stop();
  });

  test('admin can resolve report and delete post', async () => {
    // create users
    const reporter = await User.create({ username: 'rep', email: 'rep@example.com', password: 'x' });
    const author = await User.create({ username: 'author', email: 'a@example.com', password: 'x' });
    const admin = await User.create({ username: 'admin', email: 'adm@example.com', password: 'x', roles: ['admin'] });

    const post = await Post.create({ author: author._id, content: 'spammy', isDraft: false });
    const report = await Report.create({ reporter: reporter._id, targetType: 'post', targetId: post._id, reason: 'spam' });

    // Sanity check: ensure report saved and queryable in DB
    // This helps debug intermittent test DB / model resolution issues
    // eslint-disable-next-line no-console
    console.log('debug: created report id=', report._id.toString());

    const token = jwt.sign({ id: admin._id, roles: admin.roles }, process.env.ACCESS_TOKEN_SECRET);

    const res = await request(app)
      .post(`/api/admin/moderation/reports/${report._id}/resolve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'delete-post' })
      .expect(200);

    expect(res.body.ok).toBeTruthy();
    const updatedPost = await Post.findById(post._id);
    expect(updatedPost.isDeleted).toBeTruthy();
    const updatedReport = await Report.findById(report._id);
    expect(updatedReport.status).toBe('resolved');
    expect(updatedReport.resolvedBy.toString()).toBe(admin._id.toString());
  });
});
