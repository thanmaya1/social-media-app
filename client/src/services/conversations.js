import api from './api';

export async function getConversations() {
  const res = await api.get('/conversations');
  return res.data;
}

export async function searchUsers(q) {
  const res = await api.get('/users', { params: { q } });
  return res.data;
}
