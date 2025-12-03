// server/scripts/testLocalMongoConnection.js
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || 'mongodb://mongo:27017/social_media_app';

async function main() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB OK ->', uri);
    await mongoose.disconnect();
    return;
  } catch (err) {
    console.error('Mongo connection failed:', err.message || err);
    return;
  }
}

main();
