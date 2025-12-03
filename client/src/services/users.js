import api from './api';

export async function getUser(id) {
  const res = await api.get(`/users/${id}`);
  return res.data;
}

export async function updateProfile(id, data) {
  const res = await api.put(`/users/${id}`, data);
  return res.data;
}

export async function uploadAvatar(id, file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.put(`/users/${id}/avatar`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function uploadCover(id, file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.put(`/users/${id}/cover`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function follow(id) {
  const res = await api.post(`/users/${id}/follow`);
  return res.data;
}

export async function unfollow(id) {
  const res = await api.post(`/users/${id}/unfollow`);
  return res.data;
}

export async function getFollowers(id) {
  const res = await api.get(`/users/${id}/followers`);
  return res.data;
}

export async function getFollowing(id) {
  const res = await api.get(`/users/${id}/following`);
  return res.data;
}

export async function block(id) {
  const res = await api.post(`/users/${id}/block`);
  return res.data;
}

export async function unblock(id) {
  const res = await api.post(`/users/${id}/unblock`);
  return res.data;
}

export async function searchUsers(q) {
  const res = await api.get('/users', { params: { q } });
  return res.data;
}

export async function getFollowers(id, params = {}) {
  const res = await api.get(`/users/${id}/followers`, { params });
  return res.data;
}

export async function getFollowing(id, params = {}) {
  const res = await api.get(`/users/${id}/following`, { params });
  return res.data;
}
