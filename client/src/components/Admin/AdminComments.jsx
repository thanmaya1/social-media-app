import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function AdminComments() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadQueue();
  }, []);

  async function loadQueue() {
    setLoading(true);
    try {
      const res = await api.get('/admin/moderation/queue');
      const q = res.data.reports || [];
      setQueue(q);
      setSelected(new Set());
      setSelectAll(false);
    } catch (e) {
      console.error('Failed to load moderation queue', e);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id) {
    setSelected((s) => {
      const copy = new Set(s);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      setSelectAll(copy.size === queue.length && queue.length > 0);
      return copy;
    });
  }

  function toggleSelectAll() {
    if (selectAll) {
      setSelected(new Set());
      setSelectAll(false);
    } else {
      const all = new Set(queue.map((i) => i._id));
      setSelected(all);
      setSelectAll(true);
    }
  }

  async function handleAction(itemId, action) {
    try {
      setBusy(true);
      await api.post(`/admin/moderation/reports/${itemId}/resolve`, { action });
      setQueue((q) => q.filter((i) => i._id !== itemId));
      setSelected((s) => {
        const copy = new Set(s);
        copy.delete(itemId);
        return copy;
      });
    } catch (e) {
      alert('Failed to perform action');
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkAction(action) {
    if (selected.size === 0) return alert('No items selected');
    if (!confirm(`Are you sure you want to ${action} ${selected.size} items?`)) return;
    try {
      setBusy(true);
      const ids = Array.from(selected);
      const res = await api.post('/admin/moderation/reports/bulk', { ids, action });
      const processed = res.data.processed || [];
      setQueue((q) => q.filter((i) => !processed.includes(i._id)));
      setSelected(new Set());
      setSelectAll(false);
    } catch (e) {
      alert('Bulk action failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div>Loading moderation queue…</div>;

  return (
    <div className="card">
      <h3>Comment/Content Moderation</h3>
      {queue.length === 0 ? (
        <div>No items awaiting moderation</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} /> Select all
            </label>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-primary" onClick={() => handleBulkAction('approved')} disabled={busy}>Approve Selected</button>
              <button className="btn btn-sm btn-danger" onClick={() => handleBulkAction('removed')} disabled={busy}>Remove Selected</button>
              <button className="btn btn-sm btn-ghost" onClick={() => handleBulkAction('dismissed')} disabled={busy}>Dismiss Selected</button>
            </div>
          </div>

          {queue.map((item) => (
            <div key={item._id} style={{ border: '1px solid #eee', padding: 12, borderRadius: 6, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ marginTop: 6 }}>
                <input type="checkbox" checked={selected.has(item._id)} onChange={() => toggleSelect(item._id)} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{item.targetType} — {item.targetId}</div>
                <div style={{ color: '#666', marginTop: 6 }}>{item.reason}</div>
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-sm btn-primary" onClick={() => handleAction(item._id, 'approved')} disabled={busy}>Approve</button>
                  <button className="btn btn-sm btn-danger" style={{ marginLeft: 8 }} onClick={() => handleAction(item._id, 'removed')} disabled={busy}>Remove</button>
                  <button className="btn btn-sm btn-ghost" style={{ marginLeft: 8 }} onClick={() => handleAction(item._id, 'dismissed')} disabled={busy}>Dismiss</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
