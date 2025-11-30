import api from './api';

export async function createPost(formData) {
  // allow an optional onUploadProgress callback by passing it as formData._onUploadProgress
  const onUploadProgress = formData._onUploadProgress;
  if (onUploadProgress) delete formData._onUploadProgress;
  const res = await api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress });
  return res.data;
}

export async function getFeed(params) {
  const res = await api.get('/posts', { params });
  return res.data;
}

export async function likePost(postId) {
  const res = await api.post(`/posts/${postId}/like`);
  return res.data;
}
