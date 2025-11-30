const http = require('http');
const { connectDB } = require('./config/database');
const { createApp } = require('./app');

const app = createApp();
const logger = require('./utils/logger');
const server = http.createServer(app);

// socket.io
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET', 'POST'] }
});
app.set('io', io);

async function start() {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => logger.info('Server running on port %d', PORT));
}

start();

module.exports = { app, server };

io.on('connection', socket => {
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

  socket.on('send_message', async (data, ack) => {
    // data: { to, content, type }
    const Message = require('./models/Message');
    const Notification = require('./models/Notification');
    try {
      if (!userId) return ack && ack({ error: 'Unauthorized' });
      const { to, content, type } = data;
      const msg = await Message.create({ sender: userId, recipient: to, content, type: type || 'text' });

      // create notification for recipient
      await Notification.create({ recipient: to, sender: userId, type: 'message', message: content });

      // emit to recipient if online
      const online = app.get('onlineUsers') || new Map();
      const toSocketId = online.get(to);
      const populated = await Message.findById(msg._id).populate('sender', 'username profilePicture');
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
