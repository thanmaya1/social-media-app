import api from './api';

export async function getDrafts(params) {
  const res = await api.get('/posts/drafts', { params });
  return res.data;
}

export async function publishDraft(id) {
  const res = await api.post(`/posts/drafts/${id}/publish`);
  return res.data;
}
