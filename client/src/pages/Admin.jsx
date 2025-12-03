import React, { useEffect, useState } from 'react';
import { connectSocket, subscribe } from '../socket';
import {
  fetchUsers,
  updateUserRoles,
  fetchModerationQueue,
  resolveReport,
  banUser,
  unbanUser,
  verifyUser,
  unverifyUser,
  autoVerifyAll,
  fetchSettings,
  setAutoVerify,
} from '../services/admin';
import AdminComments from '../components/Admin/AdminComments';

const AVAILABLE_ROLES = ['user', 'moderator', 'admin'];

export default function Admin() {
  const [users, setUsers] = useState(null);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoVerifyThreshold, setAutoVerifyThreshold] = useState(100);
  const [autoVerifyEnabled, setAutoVerifyEnabled] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchModerationQueue(), fetchSettings()])
      .then(([u, q, s]) => {
        setUsers(u);
        setReports(q);
        setAutoVerifyEnabled(!!s.autoVerifySocial);
      })
      .catch((e) => setError('Not authorized or failed to load'))
      .finally(() => setLoading(false));
    // subscribe to admin notifications (new reports) to refresh moderation queue
    const s = connectSocket();
    const unsub = subscribe('new_notification', async (n) => {
      try {
        if (n && n.type === 'system' && typeof n.message === 'string' && n.message.startsWith('New report')) {
          const q = await fetchModerationQueue();
          setReports(q);
        }
      } catch (e) {}
    });
    return () => {
      unsub();
    };
  }, []);

  const toggleRole = async (userId, role) => {
    try {
      const u = users.find((x) => x._id === userId);
      const next = new Set(u.roles || []);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      // optimistic UI update
      const saved = await updateUserRoles(userId, Array.from(next));
      setUsers(users.map((x) => (x._id === userId ? saved : x)));
    } catch (e) {
      setError('Failed to update roles');
    }
  };

  if (loading)
    return (
      <div className="container">
        <h2>Admin</h2>
        <div>Loading…</div>
      </div>
    );
  if (error)
    return (
      <div className="container">
        <h2>Admin</h2>
        <div>{error}</div>
      </div>
    );

  const deleteUser = async (userId) => {
    if (!window.confirm('Delete user and all their data? This is irreversible.')) return;
    try {
      await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', credentials: 'include' });
      setUsers(users.filter((u) => u._id !== userId));
    } catch (e) {
      setError('Failed to delete user');
    }
  };

  const handleBan = async (userId) => {
    try {
      const updated = await banUser(userId);
      setUsers(users.map((u) => (u._id === updated._id ? updated : u)));
    } catch (e) {
      setError('Failed to ban user');
    }
  };

  const handleUnban = async (userId) => {
    try {
      const updated = await unbanUser(userId);
      setUsers(users.map((u) => (u._id === updated._id ? updated : u)));
    } catch (e) {
      setError('Failed to unban user');
    }
  };

  const handleVerify = async (userId) => {
    try {
      const updated = await verifyUser(userId);
      setUsers(users.map((u) => (u._id === updated._id ? updated : u)));
    } catch (e) {
      setError('Failed to verify user');
    }
  };

  const handleUnverify = async (userId) => {
    try {
      const updated = await unverifyUser(userId);
      setUsers(users.map((u) => (u._id === updated._id ? updated : u)));
    } catch (e) {
      setError('Failed to unverify user');
    }
  };

  const resolve = async (reportId, action) => {
    try {
      await resolveReport(reportId, action);
      setReports((r) => (r || []).filter((x) => x._id !== reportId));
    } catch (e) {
      setError('Failed to resolve report');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Admin — Users</h2>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            Threshold:
            <input
              type="number"
              value={autoVerifyThreshold}
              onChange={(e) => setAutoVerifyThreshold(parseInt(e.target.value || '0', 10))}
              style={{ width: 100 }}
            />
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={autoVerifyEnabled}
              onChange={async (e) => {
                const val = !!e.target.checked;
                try {
                  await setAutoVerify(val);
                  setAutoVerifyEnabled(val);
                } catch (err) {
                  setError('Failed to update auto-verify setting');
                }
              }}
            />
            Auto-verify social signups
          </label>
          <button
            className="btn btn-primary btn-sm"
            onClick={async () => {
              try {
                const res = await autoVerifyAll(autoVerifyThreshold);
                // refresh users list
                const u = await fetchUsers();
                setUsers(u);
                // show simple alert with result
                alert(`Auto-verified ${res.verified || 0} users`);
              } catch (e) {
                setError('Auto-verify failed');
              }
            }}
          >
            Auto-verify requests
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          {users && users.length ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Roles</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.username || u.email || u._id}</td>
                    <td>
                      {AVAILABLE_ROLES.map((r) => (
                        <label key={r} style={{ marginRight: 8 }}>
                          <input
                            type="checkbox"
                            checked={(u.roles || []).includes(r)}
                            onChange={() => toggleRole(u._id, r)}
                          />{' '}
                          {r}
                        </label>
                      ))}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <small style={{ color: 'var(--muted)' }}>
                          Last login: {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}
                        </small>
                        <button className="btn btn-ghost btn-sm" onClick={() => deleteUser(u._id)}>
                          Delete
                        </button>
                        {u.isVerified ? (
                          <span style={{ marginLeft: 8, color: 'green' }} title="Verified">✅</span>
                        ) : u.verificationRequested ? (
                          <button className="btn btn-primary btn-sm" onClick={() => handleVerify(u._id)}>
                            Verify
                          </button>
                        ) : (
                          <button className="btn btn-ghost btn-sm" title="User has not requested verification" disabled>
                            —
                          </button>
                        )}
                        {u.isActive ? (
                          <button className="btn btn-danger btn-sm" onClick={() => handleBan(u._id)}>
                            Ban
                          </button>
                        ) : (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleUnban(u._id)}>
                            Unban
                          </button>
                        )}
                        {u.isVerified && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleUnverify(u._id)}>
                            Unverify
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div>No users found</div>
          )}
        </div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Moderation Queue</h3>
        <AdminComments />
        {reports && reports.length ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {reports.map((r) => (
              <li key={r._id} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{r.reporter && r.reporter.username}</strong> reported {r.targetType}
                    <div style={{ marginTop: 6 }}>{r.reason}</div>
                    <div style={{ marginTop: 6, color: 'var(--muted)' }}>
                      Target: {r.target && (r.target.content || r.target.username || r.target._id)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => resolve(r._id, 'dismiss')}>Dismiss</button>
                    {r.targetType === 'post' && (
                      <button className="btn btn-danger" onClick={() => resolve(r._id, 'delete-post')}>Delete Post</button>
                    )}
                    {r.targetType === 'comment' && (
                      <button className="btn btn-danger" onClick={() => resolve(r._id, 'delete-comment')}>Delete Comment</button>
                    )}
                    {r.targetType === 'user' && (
                      <button className="btn btn-danger" onClick={() => resolve(r._id, 'ban-user')}>Ban User</button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ padding: 12 }}>No open reports</div>
        )}
      </div>
    </div>
  );
}
