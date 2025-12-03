let client = null;
let enabled = false;

function init() {
  if (enabled || client) return;
  const url = process.env.REDIS_URL;
  if (!url) return;
  try {
    // try to require ioredis if installed
    // optional dependency: if not present, Redis features will be disabled
    // to enable in production, set REDIS_URL and install ioredis in your environment
    // npm install ioredis
    // eslint-disable-next-line global-require
    const IORedis = require('ioredis');
    client = new IORedis(url);
    enabled = true;
  } catch (err) {
    // not available or failed to connect — leave disabled
    client = null;
    enabled = false;
  }
}

function isEnabled() {
  init();
  return enabled && client;
}

function getClient() {
  init();
  return client;
}

async function addRefresh(userId, token, ttlSeconds) {
  init();
  if (!isEnabled()) return false;
  const key = `refresh:${token}`;
  const userSet = `refreshs:${userId}`;
  const multi = client.multi();
  multi.set(key, userId, 'EX', ttlSeconds || 60 * 60 * 24 * 7); // default 7d
  multi.sadd(userSet, token);
  multi.expire(userSet, ttlSeconds || 60 * 60 * 24 * 7);
  await multi.exec();
  return true;
}

async function removeRefresh(token) {
  init();
  if (!isEnabled()) return false;
  const key = `refresh:${token}`;
  const userId = await client.get(key);
  if (!userId) return false;
  const userSet = `refreshs:${userId}`;
  const multi = client.multi();
  multi.del(key);
  multi.srem(userSet, token);
  await multi.exec();
  return true;
}

async function rotateRefresh(oldToken, newToken, userId, ttlSeconds) {
  init();
  if (!isEnabled()) return false;
  const oldKey = `refresh:${oldToken}`;
  const newKey = `refresh:${newToken}`;
  const userSet = `refreshs:${userId}`;

  // Use WATCH to ensure oldKey still maps to userId
  await client.watch(oldKey);
  const val = await client.get(oldKey);
  if (!val || val !== String(userId)) {
    await client.unwatch();
    return false; // reuse or missing
  }

  const ttl = ttlSeconds || 60 * 60 * 24 * 7;
  const multi = client.multi();
  multi.del(oldKey);
  multi.srem(userSet, oldToken);
  multi.set(newKey, userId, 'EX', ttl);
  multi.sadd(userSet, newToken);
  multi.expire(userSet, ttl);
  const res = await multi.exec();
  // res is null if aborted by WATCH
  return Array.isArray(res);
}

async function clearAllForUser(userId) {
  init();
  if (!isEnabled()) return false;
  const userSet = `refreshs:${userId}`;
  const tokens = await client.smembers(userSet);
  if (!tokens || tokens.length === 0) return true;
  const multi = client.multi();
  for (const t of tokens) {
    multi.del(`refresh:${t}`);
  }
  multi.del(userSet);
  await multi.exec();
  return true;
}

module.exports = {
  init,
  isEnabled,
  addRefresh,
  removeRefresh,
  rotateRefresh,
  clearAllForUser,
  getClient,
  async quit() {
    if (client) {
      try {
        await client.quit();
      } catch (err) {
        try {
          client.disconnect();
        } catch (e) {
          void e;
        }
      }
    }
    client = null;
    enabled = false;
  },
};
