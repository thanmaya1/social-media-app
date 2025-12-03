import axios from '../lib/axios';

export async function fetchUsers() {
  const r = await axios.get('/admin/users');
  return r.data.users;
}

export async function updateUserRoles(userId, roles) {
  const r = await axios.put(`/admin/users/${userId}/roles`, { roles });
  return r.data.user;
}

export async function fetchModerationQueue() {
  const r = await axios.get('/admin/moderation/queue');
  return r.data.reports;
}

export async function resolveReport(reportId, action) {
  const r = await axios.post(`/admin/moderation/reports/${reportId}/resolve`, { action });
  return r.data;
}

export async function banUser(userId) {
  const r = await axios.post(`/admin/users/${userId}/ban`);
  return r.data.user;
}

export async function unbanUser(userId) {
  const r = await axios.post(`/admin/users/${userId}/unban`);
  return r.data.user;
}

export async function verifyUser(userId) {
  const r = await axios.post(`/admin/users/${userId}/verify`);
  return r.data.user;
}

export async function unverifyUser(userId) {
  const r = await axios.post(`/admin/users/${userId}/unverify`);
  return r.data.user;
}

export async function autoVerifyAll(threshold) {
  const r = await axios.post(`/admin/auto-verify`, { threshold });
  return r.data;
}

export async function fetchSettings() {
  const r = await axios.get('/admin/settings');
  return r.data.settings || {};
}

export async function setAutoVerify(enabled) {
  const r = await axios.post('/admin/settings/auto-verify', { enabled });
  return r.data;
}
