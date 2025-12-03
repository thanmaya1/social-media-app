import axios from 'axios';

const instance = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Attach CSRF token from cookie to mutating requests
instance.interceptors.request.use((cfg) => {
  if (['post', 'put', 'patch', 'delete'].includes((cfg.method || '').toLowerCase())) {
    // read XSRF-TOKEN cookie (double-submit pattern)
    const matches = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'));
    if (matches) cfg.headers['x-csrf-token'] = decodeURIComponent(matches[2]);
  }
  return cfg;
});

// Show a toast on 403 Forbidden responses for better UX
import { showToast } from './toastBridge';

instance.interceptors.response.use(
  (res) => res,
  (err) => {
    try {
      if (err && err.response && err.response.status === 403) {
        const msg = (err.response.data && err.response.data.error) || 'Action not allowed';
        showToast(msg, { type: 'error', title: 'Forbidden' });
      }
    } catch (e) {
      // ignore
    }
    return Promise.reject(err);
  }
);

export default instance;
