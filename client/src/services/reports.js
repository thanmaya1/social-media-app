import api from './api';

export async function createReport({ targetType, targetId, reason }) {
  const r = await api.post('/reports', { targetType, targetId, reason });
  return r.data.report;
}
