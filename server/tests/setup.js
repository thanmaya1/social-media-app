/* eslint-env jest */
/* eslint-disable node/no-unpublished-require */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

module.exports = {
  async start() {
    // If a MONGO_URI is provided via env, use that (useful for CI or local Mongo)
    if (process.env.MONGO_URI) {
        await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
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
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  },
};
