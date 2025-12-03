/* eslint-env jest */
/* eslint-disable node/no-unpublished-require */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Increase Jest timeout for setup hooks to allow mongodb-memory-server to download binaries
try {
  // eslint-disable-next-line no-undef
  jest.setTimeout(120000);
} catch (e) {
  // not running under Jest or already set
}

module.exports = {
  async start() {
    // If a MONGO_URI is provided via env AND the test runner explicitly
    // opts into using it via `USE_EXTERNAL_MONGO=true`, connect to that.
    // Otherwise prefer the in-memory server to avoid accidental external
    // network calls during local runs.
    if (process.env.MONGO_URI && process.env.USE_EXTERNAL_MONGO === 'true') {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      // ensure a clean database when using an external Mongo (useful for repeated local runs)
      try {
        await mongoose.connection.db.dropDatabase();
      } catch (err) {
        // ignore drop errors
      }
      // set some defaults needed by auth controller
      process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'testaccesssecret';
      process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'testrefreshsecret';
      return;
    }

    // otherwise fall back to in-memory MongoDB (downloads binary on first run)
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGO_URI = uri;
    // connect
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    // set some defaults needed by auth controller
    process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'testaccesssecret';
    process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'testrefreshsecret';
  },
  async stop() {
    // disconnect mongoose
    await mongoose.disconnect();
    // stop in-memory mongo if used
    if (mongoServer) await mongoServer.stop();
    // close optional redis client if created
    try {
      // require here to avoid hard dependency when redis not installed
      // eslint-disable-next-line global-require
      const redisClient = require('../utils/redisClient');
      if (redisClient && typeof redisClient.quit === 'function') await redisClient.quit();
    } catch (err) {
      // ignore errors here
    }
  },
};

// Note: Do NOT auto-start the in-memory server here. Tests should call
// `start()` and `stop()` explicitly to manage lifecycle and avoid double-connects.
