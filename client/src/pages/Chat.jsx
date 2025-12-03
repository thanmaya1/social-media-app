import React, { useEffect, useState, useRef } from 'react';
import { connectSocket, subscribe, emit } from '../socket';
import { sendMessage, deleteMessage } from '../services/messages';
import { getUser } from '../services/users';
import { getConversations } from '../services/conversations';
import { useAuth } from '../context/AuthContext';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [to, setTo] = useState('');
  const [blockedByCurrentUser, setBlockedByCurrentUser] = useState(false);
  const [blockedCurrentUser, setBlockedCurrentUser] = useState(false);
  const [conversationsMap, setConversationsMap] = useState(new Map());
  const [deletingId, setDeletingId] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const s = connectSocket();
    const unsub1 = subscribe('receive_message', (msg) => setMessages((m) => [...m, msg]));
    const unsub2 = subscribe('message_deleted', (data) => {
      setMessages((m) => m.filter((x) => x._id !== data.messageId));
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadConversations() {
      try {
        const res = await getConversations();
        const map = new Map();
        (res.conversations || []).forEach((c) => {
          const id = c.participant && (c.participant._id || c.participant);
          if (!id) return;
          map.set(id.toString(), {
            blockedByCurrentUser: !!c.blockedByCurrentUser,
            blockedCurrentUser: !!c.blockedCurrentUser,
          });
        });
        if (mounted) setConversationsMap(map);
      } catch (e) {
        // ignore
      }
    }
    loadConversations();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // Prefer conversation map flags if available
    if (!to) {
      setBlockedByCurrentUser(false);
      setBlockedCurrentUser(false);
      return;
    }
    const cached = conversationsMap.get(to.toString());
    if (cached) {
      setBlockedByCurrentUser(!!cached.blockedByCurrentUser);
      setBlockedCurrentUser(!!cached.blockedCurrentUser);
      return;
    }

    let mounted = true;
    async function checkUser() {
      try {
        const res = await getUser(to);
        if (!mounted) return;
        setBlockedByCurrentUser(!!res.blockedByCurrentUser);
        setBlockedCurrentUser(!!res.blockedCurrentUser);
      } catch (e) {
        setBlockedByCurrentUser(false);
        setBlockedCurrentUser(false);
      }
    }
    checkUser();
    return () => {
      mounted = false;
    };
  }, [to, conversationsMap]);

  async function send() {
    if (!to || !text) return;
    if (blockedByCurrentUser || blockedCurrentUser) {
      alert('Cannot send message: blocked relationship');
      return;
    }
    try {
      const res = await sendMessage({ recipient: to, content: text });
      if (res && res.message) setMessages((m) => [...m, res.message]);
      setText('');
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteMsg(msgId) {
    if (!confirm('Delete this message?')) return;
    try {
      setDeletingId(msgId);
      await deleteMessage(msgId);
      setMessages((m) => m.filter((x) => x._id !== msgId));
      emit('message_deleted', { messageId: msgId });
    } catch (err) {
      console.error(err);
      alert('Failed to delete message');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="container">
      <h2>Chat</h2>
      <div>
        <input placeholder="Recipient user id" value={to} onChange={(e) => setTo(e.target.value)} />
        {(blockedByCurrentUser || blockedCurrentUser) && (
          <div style={{ color: 'red', fontSize: 13, marginTop: 6 }}>
            Messaging disabled due to block relationship
          </div>
        )}
      </div>
      <div className="messages" style={{ borderTop: '1px solid #eee', padding: '12px 0', minHeight: '200px', maxHeight: '400px', overflowY: 'auto' }}>
        {messages.map((m) => (
          <div key={m._id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <b>{m.sender?.username || (m.sender === user?.id ? 'You' : m.sender)}</b>: {m.content}
            </div>
            {m.sender === user?.id && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => deleteMsg(m._id)}
                disabled={deletingId === m._id}
                style={{ fontSize: 12, padding: '4px 8px' }}
              >
                {deletingId === m._id ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        ))}
      </div>
      <div>
        {!blockedByCurrentUser && !blockedCurrentUser ? (
          <>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" />
            <button className="btn btn-primary" onClick={send}>
              Send
            </button>
          </>
        ) : (
          <div style={{ color: '#666', fontSize: 13 }}>Messaging not available</div>
        )}
      </div>
    </div>
  );
}
