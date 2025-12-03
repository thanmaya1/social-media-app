/* eslint-disable no-process-exit */
const http = require('http');
const { URL } = require('url');
const { connectDB } = require('./config/database');
const { createApp } = require('./app');

const app = createApp();
const logger = require('./utils/logger');
const server = http.createServer(app);

// socket.io
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      try {
        const u = new URL(origin);
        if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return cb(null, true);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Socket.IO CORS origin parse failed:', e && e.message);
      }
      const cfg = (process.env.CLIENT_URL || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (cfg.includes(origin)) return cb(null, true);
      return cb('Not allowed', false);
    },
    methods: ['GET', 'POST'],
  },
});
app.set('io', io);

async function start() {
  try {
    await connectDB();
  } catch (err) {
    // connectDB already logs; in dev we continue. In production, connectDB will throw.
  }
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => logger.info('Server running on port %d', PORT));
}

// Only auto-start the server when not running tests. Tests should import the `app`
// and start/stop servers explicitly to avoid leaving open handles.
if (process.env.NODE_ENV !== 'test') {
  start().catch((err) => {
    logger.error('Failed to start server: %o', err);
    if (process.env.NODE_ENV === 'production') process.exit(1);
  });

  // Keep process alive in development on uncaught exceptions/unhandled rejections
  process.on('uncaughtException', (err) => {
    logger.error('UncaughtException: %o', err);
    if (process.env.NODE_ENV === 'production') process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('UnhandledRejection: %o', reason);
    if (process.env.NODE_ENV === 'production') process.exit(1);
  });
}

module.exports = { app, server, start };

io.on('connection', (socket) => {
  logger.info('Socket connected: %s', socket.id);

  // Simple auth on socket connection: client should send { token }
  const jwt = require('jsonwebtoken');
  const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
  let userId = null;

  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (token) {
      const payload = jwt.verify(token, ACCESS_SECRET);
      userId = payload.id;
      // store mapping
      const online = app.get('onlineUsers') || new Map();
      online.set(userId, socket.id);
      app.set('onlineUsers', online);
    }
  } catch (err) {
    logger.warn('Socket auth failed: %s', err.message);
    // ignore auth error; socket may still be used for public events
  }
  // join a room for this user id to make broadcasting simpler
  try {
    if (userId) socket.join(userId);
  } catch (e) {
    logger.warn('Failed to join socket room for user %s: %s', userId, e && e.message);
  }

  socket.on('send_message', async (data, ack) => {
    // data: { to, content, type }
    const Message = require('./models/Message');
    const Notification = require('./models/Notification');
    try {
      if (!userId) return ack && ack({ error: 'Unauthorized' });
      const { to, content, type } = data;
      const msg = await Message.create({
        sender: userId,
        recipient: to,
        content,
        type: type || 'text',
      });

      // create notification for recipient respecting preferences
      try {
        const notificationService = require('./utils/notificationService');
        await notificationService.createNotification({
          recipient: to,
          sender: userId,
          type: 'message',
          message: content,
          app,
        });
      } catch (e) {
        // ignore notification errors
      }

      // emit message to recipient if online
      const online = app.get('onlineUsers') || new Map();
      const toSocketId = online.get(to);
      const populated = await Message.findById(msg._id).populate(
        'sender',
        'username profilePicture'
      );
      if (toSocketId) io.to(toSocketId).emit('receive_message', populated);

      // ack to sender
      ack && ack({ ok: true, message: populated });
    } catch (err) {
      logger.error('send_message error %o', err);
      ack && ack({ error: err.message || 'send failed' });
    }
  });

  socket.on('typing', (data) => {
    // data: { to }
    try {
      const online = app.get('onlineUsers') || new Map();
      const toSocketId = online.get(data.to);
      if (toSocketId) io.to(toSocketId).emit('typing', { from: userId });
    } catch (err) {
      logger.warn('typing handler error: %o', err);
    }
  });

  socket.on('stop_typing', (data) => {
    try {
      const online = app.get('onlineUsers') || new Map();
      const toSocketId = online.get(data.to);
      if (toSocketId) io.to(toSocketId).emit('stop_typing', { from: userId });
    } catch (err) {
      logger.warn('stop_typing handler error: %o', err);
    }
  });

  socket.on('disconnect', () => {
    // remove mapping
    try {
      const online = app.get('onlineUsers') || new Map();
      if (userId) online.delete(userId);
      app.set('onlineUsers', online);
    } catch (err) {
      logger.warn('Error cleaning socket mapping: %s', err.message);
    }
    logger.info('Socket disconnected: %s', socket.id);
  });
});
