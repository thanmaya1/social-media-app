const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const redisClient = require('../utils/redisClient');

router.get('/', async (req, res) => {
  const status = { ok: true, components: {} };
  // Mongo
  try {
    const state = mongoose.connection.readyState; // 1 == connected
    status.components.mongo = { connected: state === 1, state };
    if (state !== 1) status.ok = false;
  } catch (e) {
    status.components.mongo = { error: e.message };
    status.ok = false;
  }

  // Redis
  try {
    const enabled = redisClient && redisClient.isEnabled && redisClient.isEnabled();
    status.components.redis = { enabled };
    if (enabled) {
      try {
        const r = redisClient.getClient();
        const pong = await r.ping();
        status.components.redis.pong = pong;
      } catch (e) {
        status.components.redis.error = e.message;
        status.ok = false;
      }
    }
  } catch (e) {
    status.components.redis = { error: e.message };
    status.ok = false;
  }

  res.json(status);
});

module.exports = router;
