import api from './api';

export async function getMessagesWith(userId, params = {}) {
  const res = await api.get(`/messages/${userId}`, { params });
  return res.data;
}

export async function searchMessages(query, params = {}) {
  const res = await api.get('/messages/search', { params: { q: query, ...params } });
  return res.data;
}

export async function markMessageRead(messageId) {
  const res = await api.put(`/messages/${messageId}/read`);
  return res.data;
}

export async function sendMessage(payload) {
  // payload can be { recipient, content, files }
  const fd = new FormData();
  if (payload.content) fd.append('content', payload.content);
  if (payload.recipient) fd.append('recipient', payload.recipient);
  if (payload.files && payload.files.length) {
    for (const f of payload.files) fd.append('files', f);
  }
  const res = await api.post('/messages', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deleteMessage(messageId) {
  const res = await api.delete(`/messages/${messageId}`);
  return res.data;
}

export async function adminDeleteMessage(messageId) {
  const res = await api.post(`/messages/${messageId}/admin-delete`);
  return res.data;
}
