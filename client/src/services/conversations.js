import api from './api';

export async function getConversations() {
  const res = await api.get('/conversations');
  return res.data;
}

export async function searchUsers(q) {
  const res = await api.get('/users', { params: { q } });
  return res.data;
}

export async function searchMessages(conversationId, q) {
  const res = await api.get(`/conversations/${conversationId}/search`, { params: { q } });
  return res.data;
}

export async function muteConversation(conversationId) {
  const res = await api.post(`/conversations/${conversationId}/mute`);
  return res.data;
}

export async function unmuteConversation(conversationId) {
  const res = await api.post(`/conversations/${conversationId}/unmute`);
  return res.data;
}
