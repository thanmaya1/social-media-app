import React, { useState, useEffect, useRef } from 'react';
import { createPost } from '../../services/posts';

export default function PostCreate() {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const isSubmitting = useRef(false);

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
      urls.forEach(u => URL.revokeObjectURL(u.url));
    };
  }, [files]);

  async function handleSubmit(e) {
    e.preventDefault();
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
    <div style={{ border: '1px solid #eee', padding: 12, marginBottom: 16 }}>
      <form onSubmit={handleSubmit}>
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What's happening?" style={{ width: '100%', minHeight: 80 }} />
        <div style={{ marginTop: 8 }}>
          <input type="file" multiple onChange={handleFilesChange} />
        </div>

        {previews.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {previews.map((p, i) => (
              <div key={i} style={{ width: 120, height: 90, overflow: 'hidden', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.type.startsWith('image') ? (
                  <img src={p.url} alt={p.name} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                ) : (
                  <video src={p.url} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                )}
              </div>
            ))}
          </div>
        )}

        {progress > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ background: '#eee', height: 8, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#4caf50' }} />
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{progress}%</div>
          </div>
        )}

        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button type="submit" style={{ marginTop: 8 }} disabled={isSubmitting.current}>Post</button>
      </form>
    </div>
  );
}
