import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../lib/axios';
import { connectSocket, subscribe } from '../socket';

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = React.useRef();
  const firstActionRef = React.useRef();

  const loadCount = async () => {
    try {
      const res = await axios.get('/notifications/unread-count');
      setUnread(res.data.unread || 0);
    } catch (e) {
      // ignore
    }
  };

  const loadItems = async () => {
    try {
      const res = await axios.get('/notifications?page=1&limit=6');
      setItems(res.data.notifications || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadCount();
    const s = connectSocket();
    const unsubNew = subscribe('new_notification', (n) => {
      setUnread((u) => u + 1);
      // prepend to list if open
      setItems((prev) => [n, ...prev].slice(0, 6));
    });
    const unsubRead = subscribe('notification_read', (d) => setUnread((u) => Math.max(0, u - 1)));
    const unsubAll = subscribe('notifications_read_all', () => setUnread(0));

    return () => {
      try {
        unsubNew();
        unsubRead();
        unsubAll();
      } catch (e) {}
    };
  }, []);

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  useEffect(() => {
    if (open) {
      // focus first actionable element for keyboard users
      const el = firstActionRef.current || (ref.current && ref.current.querySelector('button'));
      if (el && el.focus) el.focus();
    }
  }, [open]);

  const toggle = async (ev) => {
    if (ev && ev.preventDefault) ev.preventDefault();
    const next = !open;
    setOpen(next);
    if (next) await loadItems();
  };

  const onKeyToggle = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  const markRead = async (id) => {
    try {
      await axios.put(`/notifications/${id}/read`);
      setItems((prev) => prev.map((p) => (p._id === id ? { ...p, read: true } : p)));
      setUnread((u) => Math.max(0, u - 1));
    } catch (e) {}
  };

  const markAll = async () => {
    try {
      await axios.put('/notifications/read-all');
      setItems((prev) => prev.map((p) => ({ ...p, read: true })));
      setUnread(0);
    } catch (e) {}
  };

  const deleteOne = async (id) => {
    try {
      await axios.delete(`/notifications/${id}`);
      setItems((prev) => prev.filter((p) => p._id !== id));
    } catch (e) {}
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={toggle}
        onKeyDown={onKeyToggle}
        aria-haspopup="true"
        aria-expanded={open}
        title="Notifications"
        style={{
          background: 'transparent',
          border: 0,
          padding: 6,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M15 17H9v-6a3 3 0 0 1 6 0v6z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19 13v-2a7 7 0 1 0-14 0v2l-2 2v1h20v-1l-2-2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && (
          <span
            style={{
              background: '#e53e3e',
              color: '#fff',
              borderRadius: 999,
              padding: '2px 6px',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 320,
            maxWidth: 'calc(100vw - 24px)',
            background: '#fff',
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
            borderRadius: 8,
            zIndex: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 10,
              borderBottom: '1px solid #eee',
            }}
          >
            <strong>Notifications</strong>
            <div>
              <button className="btn btn-ghost" onClick={markAll} style={{ marginRight: 8 }}>
                Mark all
              </button>
              <a href="/notifications" onClick={() => setOpen(false)} className="btn btn-ghost">
                View all
              </a>
            </div>
          </div>

          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {items.length === 0 && (
              <div style={{ padding: 12, color: '#666' }}>No notifications</div>
            )}
            {items.map((n) => (
              <div
                key={n._id}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: 10,
                  alignItems: 'flex-start',
                  borderBottom: '1px solid #f6f6f6',
                  background: n.read ? '#fff' : '#f9fafb',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#111' }}>{n.title || n.type}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{n.body || n.text || ''}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {!n.read && (
                    <button
                      ref={firstActionRef}
                      className="btn btn-sm"
                      onClick={() => markRead(n._id)}
                    >
                      Mark
                    </button>
                  )}
                  <button className="btn btn-sm btn-danger" onClick={() => deleteOne(n._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
