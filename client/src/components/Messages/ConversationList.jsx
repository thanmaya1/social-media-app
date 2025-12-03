import React, { useEffect, useState } from 'react';
import { getConversations, searchUsers, muteConversation, unmuteConversation } from '../../services/conversations';

export default function ConversationList({ onSelect }) {
  const [conversations, setConversations] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [togglingMute, setTogglingMute] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await getConversations();
      setConversations(res.conversations || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMuteToggle(conversationId, isMuted, e) {
    e.stopPropagation();
    try {
      setTogglingMute(conversationId);
      if (isMuted) {
        await unmuteConversation(conversationId);
      } else {
        await muteConversation(conversationId);
      }
      // Refresh conversations
      await load();
    } catch (err) {
      console.error('Failed to toggle mute:', err);
    } finally {
      setTogglingMute(null);
    }
  }

  async function handleSearch(e) {
    const q = e.target.value;
    setQuery(q);
    if (!q) return setResults([]);
    try {
      const res = await searchUsers(q);
      // respect blocked flags returned by server and avoid per-user calls
      setResults(
        (res.users || []).map((u) => ({
          ...u,
          // ensure booleans
          blockedByCurrentUser: !!u.blockedByCurrentUser,
          blockedCurrentUser: !!u.blockedCurrentUser,
        }))
      );
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div style={{ width: 320, borderRight: '1px solid #eee', padding: 8 }}>
      <h4>Conversations</h4>
      <input
        placeholder="Search users"
        value={query}
        onChange={handleSearch}
        style={{ width: '100%', marginBottom: 8 }}
      />
      {results.length > 0 ? (
        <div>
          {results.map((u) => (
            <div
              key={u._id}
              style={{ padding: 8, borderBottom: '1px solid #f0f0f0', cursor: u.blockedByCurrentUser || u.blockedCurrentUser ? 'default' : 'pointer', opacity: u.blockedByCurrentUser || u.blockedCurrentUser ? 0.6 : 1 }}
              onClick={() => {
                if (u.blockedByCurrentUser || u.blockedCurrentUser) return;
                onSelect(u._id);
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 'bold' }}>{u.username}</div>
                {(u.blockedByCurrentUser || u.blockedCurrentUser) && (
                  <div style={{ fontSize: 12, color: '#c33' }}>
                    {u.blockedCurrentUser ? 'You are blocked' : u.blockedByCurrentUser ? 'You blocked' : ''}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>{u.bio}</div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {conversations.length === 0 && <div>No conversations yet</div>}
          {conversations.map((c) => (
            <div
              key={c.participant}
              style={{
                padding: 8,
                borderBottom: '1px solid #f0f0f0',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onClick={() => onSelect(c.participant)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>
                  {c.lastMessage?.sender?.username || c.participant}
                  {c.isMuted && <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>🔇 Muted</span>}
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>{c.lastMessage?.content}</div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => handleMuteToggle(c._id, c.isMuted, e)}
                  disabled={togglingMute === c._id}
                  title={c.isMuted ? 'Unmute' : 'Mute'}
                  style={{ fontSize: 12, padding: '4px 8px' }}
                >
                  {togglingMute === c._id ? '...' : c.isMuted ? '🔇' : '🔔'}
                </button>
                {c.unread > 0 && (
                  <div
                    style={{
                      background: '#e0245e',
                      color: '#fff',
                      minWidth: 24,
                      height: 24,
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 8px',
                    }}
                  >
                    {c.unread}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
