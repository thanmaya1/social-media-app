import { io } from 'socket.io-client';

let socket = null;
const listeners = new Map();

export function connectSocket() {
  if (!socket) {
    // Check if we're in a test/non-browser environment
    if (typeof window === 'undefined') {
      return null;
    }
    // Use Vite environment variable `VITE_API_URL` if provided. Default to relative `/api`.
    // If no absolute URL is provided, let socket.io connect to the current origin (dev server),
    // which allows Vite's proxy to forward websocket upgrades to the backend.
    let rawApiUrl = '/api';
    try {
      // Access import.meta safely
      if (globalThis.import?.meta?.env?.VITE_API_URL) {
        rawApiUrl = globalThis.import.meta.env.VITE_API_URL;
      }
    } catch (e) {
      // import.meta not available, use default
    }
    let url;
    if (/^https?:\/\//.test(rawApiUrl)) url = rawApiUrl.replace(/\/api\/?$/, '');
    else url = undefined; // undefined -> connect to current origin
    // include access token for socket auth
    const token = localStorage.getItem('accessToken');
    socket = io(url, { transports: ['websocket', 'polling'], auth: { token } });
  }
  return socket;
}

export function subscribe(event, cb) {
  const s = connectSocket();
  if (!s || !s.on) {
    // Test/mocked environment fallback: store listener and return noop unsubscribe
    listeners.set(cb, { event, cb });
    return () => {
      listeners.delete(cb);
    };
  }
  s.on(event, cb);
  listeners.set(cb, { event, cb });
  return () => {
    s.off(event, cb);
    listeners.delete(cb);
  };
}

export function emit(event, data) {
  const s = connectSocket();
  if (!s || !s.emit) return;
  s.emit(event, data);
}
