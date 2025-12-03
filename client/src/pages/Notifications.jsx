import React, { useEffect, useState } from 'react';
import axios from '../lib/axios';
import { connectSocket, subscribe } from '../socket';
import Skeleton from '../components/UI/Skeleton';

export default function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await axios.get(`/notifications?page=${page}&limit=${limit}`);
    setNotifs(res.data.notifications || []);
    const cntRes = await axios.get('/notifications/unread-count');
    setUnread(cntRes.data.unread || 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const s = connectSocket();
    const unsubNew = subscribe('new_notification', (n) => {
      setNotifs((prev) => [n, ...prev]);
      setUnread((u) => u + 1);
    });
    const unsubRead = subscribe('notification_read', (data) => {
      setNotifs((prev) => prev.map((p) => (p._id === data.id ? { ...p, read: true } : p)));
      setUnread((u) => Math.max(0, u - 1));
    });

    return () => {
      unsubNew();
      unsubRead();
    };
  }, []);

  const prev = () => {
    setPage((p) => Math.max(1, p - 1));
  };

  const next = () => {
    setPage((p) => p + 1);
  };

  useEffect(() => {
    load();
  }, [page, limit]);

  const markAll = async () => {
    await axios.put('/notifications/read-all');
    load();
  };

  const markRead = async (id) => {
    await axios.put(`/notifications/${id}/read`);
    setNotifs((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
  };

  const del = async (id) => {
    await axios.delete(`/notifications/${id}`);
    setNotifs((prev) => prev.filter((n) => n._id !== id));
  };

  return (
    <div className="container">
      <h2>Notifications {unread > 0 && <small>({unread} unread)</small>}</h2>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          className="btn btn-ghost"
          onClick={markAll}
          aria-label="Mark all notifications read"
        >
          Mark all read
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13 }}>Per page:</label>
          <select
            aria-label="Notifications per page"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(1)} disabled={page === 1}>
            First
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span>Page {page}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton height={60} />
          <Skeleton height={60} />
          <Skeleton height={60} />
        </div>
      ) : (
        <>
          {notifs.length === 0 ? (
            <div style={{ padding: 12, color: '#666' }}>No notifications</div>
          ) : (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notifs.map((n) => (
                <li
                  key={n._id}
                  style={{
                    opacity: n.read ? 0.6 : 1,
                    border: '1px solid #eee',
                    padding: 8,
                    borderRadius: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{n.type}</div>
                    <div style={{ color: '#333' }}>
                      {n.message ||
                        (n.sender?.username ? `${n.sender.username} sent you a ${n.type}` : n.type)}
                    </div>
                    <div style={{ fontSize: 12, color: '#777' }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {!n.read && (
                      <button className="btn btn-ghost btn-sm" onClick={() => markRead(n._id)}>
                        Mark read
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => del(n._id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
