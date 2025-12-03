import api from './api';

export async function createComment(postId, formData) {
  const onUploadProgress = formData._onUploadProgress;
  if (onUploadProgress) delete formData._onUploadProgress;
  const res = await api.post(`/posts/${postId}/comments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return res.data;
}

export async function getComments(postId, params = {}) {
  const res = await api.get(`/posts/${postId}/comments`, { params });
  return res.data;
}

export async function likeComment(postId, commentId) {
  const res = await api.post(`/posts/${postId}/comments/${commentId}/like`);
  return res.data;
}

export async function replyToComment(postId, commentId, formData) {
  const onUploadProgress = formData._onUploadProgress;
  if (onUploadProgress) delete formData._onUploadProgress;
  const res = await api.post(`/posts/${postId}/comments/${commentId}/reply`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return res.data;
}

export async function updateComment(postId, commentId, data) {
  const res = await api.put(`/posts/${postId}/comments/${commentId}`, data);
  return res.data;
}

export async function deleteComment(postId, commentId) {
  const res = await api.delete(`/posts/${postId}/comments/${commentId}`);
  return res.data;
}
