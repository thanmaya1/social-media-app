import React, { useEffect, useState } from 'react';
import { connectSocket, subscribe, emit } from '../socket';
import api from '../services/api';
import ConversationList from '../components/Messages/ConversationList';

export default function Messages() {
  const [recipientId, setRecipientId] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());

  useEffect(() => {
    const socket = connectSocket();

    const unsubReceive = subscribe('receive_message', (msg) => {
      if (!recipientId) return;
      const senderId = msg.sender?._id || msg.sender;
      const recipientMatches = senderId === recipientId || msg.recipient === recipientId;
      if (recipientMatches) setMessages((prev) => [...prev, msg]);
    });

    const unsubTyping = subscribe('typing', ({ from }) => {
      setTypingUsers((prev) => new Set(prev).add(from));
    });
    const unsubStop = subscribe('stop_typing', ({ from }) => {
      setTypingUsers((prev) => {
        const s = new Set(prev);
        s.delete(from);
        return s;
      });
    });

    return () => {
      unsubReceive();
      unsubTyping();
      unsubStop();
    };
  }, [recipientId]);

  async function loadMessages() {
    if (!recipientId) return;
    const res = await api.get(`/messages/${recipientId}`);
    setMessages(res.data.messages || []);
  }

  async function handleSearch() {
    if (!searchQ.trim()) return;
    try {
      const res = await api.get(`/messages/search`, { params: { q: searchQ, limit: 50 } });
      setMessages(res.data.messages || []);
    } catch (e) {
      console.error('Search failed', e);
    }
  }

  async function handleDelete(messageId) {
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages((m) => m.filter((x) => x._id !== messageId));
    } catch (e) {
      console.error('Delete failed', e);
    }
  }

  useEffect(() => {
    loadMessages();
  }, [recipientId]);

  function handleTyping() {
    emit('typing', { to: recipientId });
  }
  function handleStopTyping() {
    emit('stop_typing', { to: recipientId });
  }

  function handleSend() {
    if (!recipientId || !text.trim()) return;
    emit('send_message', { to: recipientId, content: text }, (ack) => {
      if (ack && ack.ok) {
        setMessages((prev) => [...prev, ack.message]);
        setText('');
      }
    });
  }

  return (
    <div style={{ display: 'flex', padding: 20 }}>
      <ConversationList onSelect={(id) => setRecipientId(id)} />
      <div style={{ flex: 1, marginLeft: 16 }}>
        <h2>Messages</h2>
        <div style={{ marginBottom: 8 }}>
          <label>Recipient User ID:</label>
          <input
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            style={{ marginLeft: 8 }}
          />
          <button onClick={loadMessages} style={{ marginLeft: 8 }}>
            Load
          </button>
          <span style={{ marginLeft: 12 }} />
          <label>Search messages:</label>
          <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} style={{ marginLeft: 8 }} />
          <button onClick={handleSearch} style={{ marginLeft: 8 }}>
            Search
          </button>
        </div>
        <div style={{ border: '1px solid #eee', padding: 12, height: 400, overflowY: 'auto' }}>
          {messages.map((m) => (
            <div key={m._id} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#666' }}>{m.sender?.username || m.sender}</div>
              <div>{m.content}</div>
              <div style={{ fontSize: 10, color: '#999' }}>
                {new Date(m.createdAt).toLocaleString()}
              </div>
              <div style={{ marginTop: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(m._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          {typingUsers.size > 0 && <div>Typing...</div>}
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            onBlur={handleStopTyping}
            style={{ width: '100%', height: 80 }}
          />
          <button onClick={handleSend} style={{ marginTop: 8 }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
