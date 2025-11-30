import { io } from 'socket.io-client';

let socket = null;
const listeners = new Map();

export function connectSocket() {
  if (!socket) {
    const url = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000';
    // include access token for socket auth
    const token = localStorage.getItem('accessToken');
    socket = io(url, { transports: ['websocket', 'polling'], auth: { token } });
  }
  return socket;
}

export function subscribe(event, cb) {
  const s = connectSocket();
  s.on(event, cb);
  listeners.set(cb, { event, cb });
  return () => {
    s.off(event, cb);
    listeners.delete(cb);
  };
}

export function emit(event, data) {
  const s = connectSocket();
  s.emit(event, data);
}
