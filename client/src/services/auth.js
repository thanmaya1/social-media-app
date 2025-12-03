import api from './api';

export async function register(data) {
  const res = await api.post('/auth/register', data);
  return res.data;
}

export async function login(data) {
  const res = await api.post('/auth/login', data);
  return res.data;
}

export async function refreshToken(refreshToken) {
  const res = await api.post('/auth/refresh-token', { refreshToken });
  return res.data;
}

export async function logout(refreshToken) {
  const res = await api.post('/auth/logout', { refreshToken });
  return res.data;
}

export async function forgotPassword(email) {
  const res = await api.post('/auth/forgot-password', { email });
  return res.data;
}

export async function resetPassword(token, password) {
  const res = await api.post(`/auth/reset-password/${token}`, { password });
  return res.data;
}

export async function verifyEmail(token) {
  const res = await api.post('/auth/verify-email', { token });
  return res.data;
}

export async function resendVerification(email) {
  const res = await api.post('/auth/resend-verification', { email });
  return res.data;
}
