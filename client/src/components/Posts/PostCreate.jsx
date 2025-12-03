import React, { useState, useEffect, useRef } from 'react';
import { createPost } from '../../services/posts';
import EmojiPicker from '../UX/EmojiPicker';
import axios from '../../lib/axios';

export default function PostCreate() {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const [mentions, setMentions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef();
  const listboxIdRef = useRef(`mention-listbox-${Math.random().toString(36).slice(2, 9)}`);
  const [liveMessage, setLiveMessage] = useState('');
  const isSubmitting = useRef(false);

  useEffect(() => {
    function globalKey(e) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;
      // Ctrl/Cmd+E toggles emoji
      if (mod && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setShowEmoji((s) => !s);
      }
      // Ctrl/Cmd+K focuses composer
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        try {
          textareaRef.current && textareaRef.current.focus();
        } catch (err) {}
      }
    }
    document.addEventListener('keydown', globalKey);
    return () => document.removeEventListener('keydown', globalKey);
  }, []);

  useEffect(() => {
    // generate previews for files
    const urls = [];
    for (const f of files) {
      try {
        const url = URL.createObjectURL(f);
        urls.push({ url, type: f.type, name: f.name });
      } catch (err) {
        // ignore
      }
    }
    setPreviews(urls);

    return () => {
      // revoke object URLs
      urls.forEach((u) => URL.revokeObjectURL(u.url));
    };
  }, [files]);

  // simple mentions autocomplete: query `/api/users?q=` when user types @<term>
  useEffect(() => {
    const lastAt = content.lastIndexOf('@');
    if (lastAt === -1) {
      setShowMentions(false);
      setMentions([]);
      return;
    }
    const sub = content.slice(lastAt + 1);
    if (!sub || /\s/.test(sub)) {
      setShowMentions(false);
      setMentions([]);
      return;
    }
    const q = sub.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30);
    if (!q) {
      setShowMentions(false);
      setMentions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get('/users', { params: { q, limit: 6 } });
        if (cancelled) return;
        let users = res.data.users || [];
        // client-side fuzzy sort: prefer startsWith, then includes
        const qlow = q.toLowerCase();
        users = users
          .map((u) => ({
            u,
            score: u.username.toLowerCase().startsWith(qlow) ? 2 : u.username.toLowerCase().includes(qlow) ? 1 : 0,
          }))
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((x) => x.u);
        setMentions(users);
        setShowMentions(users.length > 0);
        setMentionIndex(0);
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [content]);

  function handleKeyDown(e) {
    if (!showMentions || !mentions || mentions.length === 0) return;
      if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex((i) => Math.min(i + 1, mentions.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex((i) => Math.max(i - 1, 0));
      return;
    }
      if (e.key === 'Escape') {
        setShowMentions(false);
        return;
      }
      if (e.key === 'Enter') {
      // If mention menu open and a suggestion highlighted, pick it instead of newline
      if (showMentions && mentions.length > 0) {
        e.preventDefault();
        const m = mentions[mentionIndex] || mentions[0];
        if (m) {
          const lastAt = content.lastIndexOf('@');
          const before = content.slice(0, lastAt + 1);
          const after = content.slice(lastAt + 1).replace(/^\S*/, '');
          const next = before + m.username + ' ' + after;
          setContent(next);
          setShowMentions(false);
          setMentions([]);
          setTimeout(() => {
            try {
              const el = textareaRef.current;
              el.focus();
              const pos = (before + m.username + ' ').length;
              el.selectionStart = el.selectionEnd = pos;
            } catch (err) {}
          }, 0);
            // announce selection
            setLiveMessage(`${m.username} selected`);
        }
      }
    }
  }


  // Announce current highlighted mention for screen readers
  useEffect(() => {
    if (!showMentions) return;
    if (!mentions || mentions.length === 0) {
      setLiveMessage('No suggestions');
      return;
    }
    const cur = mentions[mentionIndex];
    const pos = mentionIndex + 1;
    const total = mentions.length;
    if (cur) setLiveMessage(`${cur.username}, suggestion ${pos} of ${total}`);
  }, [mentionIndex, showMentions, mentions]);
  async function handleSubmit(e, opts = {}) {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting.current) return;
    setError(null);
    setProgress(0);
    isSubmitting.current = true;

    try {
      const form = new FormData();
      form.append('content', content);
      if (files && files.length) {
        for (let i = 0; i < files.length; i++) form.append('files', files[i]);
      }
      if (opts.isDraft) form.append('isDraft', 'true');
      if (opts.scheduledAt) form.append('scheduledAt', opts.scheduledAt);

      // attach a temporary property to pass progress callback
      form._onUploadProgress = (evt) => {
        if (!evt.lengthComputable) return;
        const percent = Math.round((evt.loaded * 100) / evt.total);
        setProgress(percent);
      };

      await createPost(form);
      setContent('');
      setFiles([]);
      setPreviews([]);
      setScheduledAt('');
      setShowScheduler(false);
      setProgress(0);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create post');
    } finally {
      isSubmitting.current = false;
    }
  }

  function handleFilesChange(e) {
    const list = e.target.files;
    if (!list) return;
    // convert FileList to Array
    setFiles(Array.from(list));
  }

  return (
    <div className="post-create card">
      <form onSubmit={handleSubmit}>
        <div style={{ position: 'relative' }}>
          <textarea
            ref={textareaRef}
            className=""
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's happening?"
            rows={4}
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={showMentions}
            aria-controls={listboxIdRef.current}
            aria-activedescendant={showMentions ? `mention-${mentionIndex}` : undefined}
          />
          {showMentions && mentions && mentions.length > 0 && (
            <div
              id={listboxIdRef.current}
              role="listbox"
              aria-label="Mention suggestions"
              style={{
                position: 'absolute',
                left: 8,
                top: '100%',
                background: '#fff',
                border: '1px solid #eee',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                zIndex: 40,
                width: 260,
                maxHeight: 240,
                overflowY: 'auto',
              }}
            >
              {mentions.map((m, idx) => (
                <div
                  id={`mention-${idx}`}
                  role="option"
                  aria-selected={idx === mentionIndex}
                  key={m._id}
                  className={idx === mentionIndex ? 'mention-item mention-item-active' : 'mention-item'}
                  tabIndex={idx === mentionIndex ? 0 : -1}
                  style={{
                    padding: 8,
                    cursor: 'pointer',
                    background: idx === mentionIndex ? 'rgba(0,0,0,0.06)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    const lastAt = content.lastIndexOf('@');
                    const before = content.slice(0, lastAt + 1);
                    const after = content.slice(lastAt + 1).replace(/^\S*/, '');
                    const next = before + m.username + ' ' + after;
                    setContent(next);
                    setShowMentions(false);
                    setMentions([]);
                    // focus and move cursor
                    setTimeout(() => {
                      try {
                        const el = textareaRef.current;
                        el.focus();
                        const pos = (before + m.username + ' ').length;
                        el.selectionStart = el.selectionEnd = pos;
                      } catch (e) {}
                    }, 0);
                  }}
                >
                  <img src={m.profilePictureThumbs?.small || m.profilePicture || '/default-avatar.png'} alt="" style={{ width: 28, height: 28, borderRadius: 6 }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong style={{ fontSize: 13 }}>{m.username}</strong>
                    <small style={{ color: 'var(--muted)' }}>{m.bio || ''}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* ARIA live region for announcement of suggestion changes/selections */}
          <div role="status" aria-live="polite" className="visually-hidden">
            {liveMessage}
          </div>
        </div>
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="file" multiple onChange={handleFilesChange} />
            <button type="button" className="btn btn-ghost" onClick={() => setShowEmoji((s) => !s)}>
              Emoji
            </button>
          </div>
          {showEmoji && (
            <div style={{ position: 'absolute', zIndex: 60 }}>
              <EmojiPicker
                onSelect={(em) => {
                  const el = textareaRef.current;
                  if (!el) {
                    setContent((c) => c + em);
                    return;
                  }
                  const start = el.selectionStart || 0;
                  const end = el.selectionEnd || 0;
                  const next = content.slice(0, start) + em + content.slice(end);
                  setContent(next);
                  requestAnimationFrame(() => {
                    try {
                      el.focus();
                      el.selectionStart = el.selectionEnd = start + em.length;
                    } catch (e) {}
                  });
                }}
              />
            </div>
          )}
          <div>
            <button
              className="btn btn-primary btn-md"
              type="submit"
              disabled={isSubmitting.current}
              onClick={(e) => handleSubmit(e, { isDraft: false })}
            >
              Post
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginLeft: 8 }}
              onClick={(e) => handleSubmit(e, { isDraft: true })}
              disabled={isSubmitting.current}
            >
              Save Draft
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginLeft: 8 }}
              onClick={() => setShowScheduler((s) => !s)}
            >
              {showScheduler ? 'Cancel Schedule' : 'Schedule'}
            </button>
          </div>
        </div>

        {showScheduler && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={() => handleSubmit(null, { isDraft: true, scheduledAt })}
              disabled={isSubmitting.current || !scheduledAt}
            >
              Schedule Post
            </button>
          </div>
        )}

        {previews.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {previews.map((p, i) => (
              <div key={i} style={{ width: 120, height: 90, overflow: 'hidden', borderRadius: 8 }}>
                {p.type.startsWith('image') ? (
                  <img
                    src={p.url}
                    alt={p.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <video
                    src={p.url}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {progress > 0 && (
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                height: 8,
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg,var(--accent),var(--accent-2))',
                }}
              />
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{progress}%</div>
          </div>
        )}

        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}
