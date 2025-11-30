import React, { useEffect, useState } from 'react';
import { getConversations, searchUsers } from '../../services/conversations';

export default function ConversationList({ onSelect }) {
  const [conversations, setConversations] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await getConversations();
      setConversations(res.conversations || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSearch(e) {
    const q = e.target.value;
    setQuery(q);
    if (!q) return setResults([]);
    try {
      const res = await searchUsers(q);
      setResults(res.users || []);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div style={{ width: 320, borderRight: '1px solid #eee', padding: 8 }}>
      <h4>Conversations</h4>
      <input placeholder="Search users" value={query} onChange={handleSearch} style={{ width: '100%', marginBottom: 8 }} />
      {results.length > 0 ? (
        <div>
          {results.map(u => (
            <div key={u._id} style={{ padding: 8, borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => onSelect(u._id)}>
              <div style={{ fontWeight: 'bold' }}>{u.username}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{u.bio}</div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {conversations.length === 0 && <div>No conversations yet</div>}
          {conversations.map(c => (
            <div key={c.participant} style={{ padding: 8, borderBottom: '1px solid #f0f0f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => onSelect(c.participant)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>{c.lastMessage?.sender?.username || c.participant}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{c.lastMessage?.content}</div>
              </div>
              {c.unread > 0 && (
                <div style={{ background: '#e0245e', color: '#fff', minWidth: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px', marginLeft: 8 }}>
                  {c.unread}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
