import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from '../UX/EmojiPicker';

export default function CommentForm({ onSubmit, placeholder = 'Write a comment...', disabled = false }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const ref = useRef();
  const taRef = useRef();

  useEffect(() => {
    // create object URLs for previews
    const p = files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    setPreviews(p);
    return () => {
      p.forEach((pp) => pp.url && URL.revokeObjectURL(pp.url));
    };
  }, [files]);

  useEffect(() => {
    // autosize textarea
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(300, el.scrollHeight) + 'px';
  }, [text]);

  function handleFiles(e) {
    const list = e.target.files;
    if (!list) return;
    setFiles(Array.from(list));
  }

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() && files.length === 0) return;
    setSubmitting(true);
    const fd = new FormData();
    if (text.trim()) fd.append('content', text.trim());
    files.forEach((f) => fd.append('files', f));
    try {
      await onSubmit(fd);
      setText('');
      setFiles([]);
      if (ref.current) ref.current.value = null;
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={disabled ? { opacity: 0.6 } : {}}
      />
      {previews.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {previews.map((p) => (
            <div
              key={p.url}
              style={{
                width: 80,
                height: 80,
                borderRadius: 6,
                overflow: 'hidden',
                background: '#f6f6f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img src={p.url} alt={p.name} style={{ maxWidth: '100%', maxHeight: '100%' }} />
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input ref={ref} type="file" multiple onChange={handleFiles} disabled={disabled} />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setShowEmoji((s) => !s)}
          disabled={disabled}
          title="Toggle emoji picker (Ctrl+E)"
        >
          😊
        </button>
        <button
          className="btn btn-primary btn-sm"
          type="submit"
          disabled={disabled || submitting || (!text.trim() && files.length === 0)}
        >
          {submitting ? 'Posting…' : 'Comment'}
        </button>
      </div>
      {showEmoji && (
        <div style={{ position: 'relative', zIndex: 50 }}>
          <EmojiPicker
            onSelect={(em) => {
              const el = taRef.current;
              if (!el) {
                setText((c) => c + em);
                return;
              }
              const start = el.selectionStart || 0;
              const end = el.selectionEnd || 0;
              const next = text.slice(0, start) + em + text.slice(end);
              setText(next);
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
    </form>
  );
}
