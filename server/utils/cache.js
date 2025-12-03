const redisClient = require('./redisClient');

async function get(key) {
  try {
    if (redisClient && redisClient.isEnabled && redisClient.isEnabled()) {
      const c = redisClient.getClient();
      if (c) {
        const v = await c.get(key);
        if (v) return JSON.parse(v);
      }
    }
  } catch (e) {
    // ignore cache errors
  }
  return null;
}

async function set(key, value, exSeconds = 30) {
  try {
    if (redisClient && redisClient.isEnabled && redisClient.isEnabled()) {
      const c = redisClient.getClient();
      if (c) {
        await c.set(key, JSON.stringify(value), 'EX', exSeconds);
        return true;
      }
    }
  } catch (e) {
    // ignore
  }
  return false;
}

module.exports = { get, set };
