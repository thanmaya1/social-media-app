import api from './api';

export async function getMessagesWith(userId, params={}) {
  const res = await api.get(`/messages/${userId}`, { params });
  return res.data;
}

export async function markMessageRead(messageId) {
  const res = await api.put(`/messages/${messageId}/read`);
  return res.data;
}
