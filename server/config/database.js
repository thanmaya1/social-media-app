const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/social_media_app';
  try {
    // Avoid reconnecting if mongoose already has an active connection
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // In development, do not crash the whole server if Mongo is unavailable —
    // allow the server to start so the frontend can load and show a friendly error.
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
    console.warn('Continuing without MongoDB (development mode). Some features will be disabled.');
    return;
  }
}

module.exports = { connectDB };
