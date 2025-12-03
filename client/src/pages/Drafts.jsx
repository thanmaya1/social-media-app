import React, { useEffect, useState } from 'react';
import { getDrafts, publishDraft } from '../services/drafts';
import { updatePost, deletePost } from '../services/posts';

export default function Drafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [content, setContent] = useState('');

  useEffect(() => {
    setLoading(true);
    getDrafts()
      .then((r) => setDrafts(r.drafts || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  async function handlePublish(id) {
    try {
      await publishDraft(id);
      setDrafts((d) => d.filter((x) => x._id !== id));
    } catch (e) {
      alert('Failed to publish');
    }
  }

  async function handleSave(id) {
    try {
      const res = await updatePost(id, { content });
      setDrafts((d) => d.map((x) => (x._id === id ? res.post : x)));
      setEditing(null);
    } catch (e) {
      alert('Failed to save draft');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete draft?')) return;
    try {
      await deletePost(id);
      setDrafts((d) => d.filter((x) => x._id !== id));
    } catch (e) {
      alert('Failed to delete');
    }
  }

  if (loading) return <div className="container">Loading drafts…</div>;

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Drafts</h2>
        {drafts.length === 0 && <div>No drafts</div>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {drafts.map((d) => (
            <li key={d._id} style={{ padding: 12, borderBottom: '1px solid #eee' }}>
              {!editing || editing !== d._id ? (
                <div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{d.content}</div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => { setEditing(d._id); setContent(d.content || ''); }}>
                      Edit
                    </button>
                    <button className="btn btn-primary" onClick={() => handlePublish(d._id)}>
                      Publish
                    </button>
                    <button className="btn btn-ghost" onClick={() => handleDelete(d._id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <textarea value={content} onChange={(e) => setContent(e.target.value)} />
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-primary" onClick={() => handleSave(d._id)}>Save</button>
                    <button className="btn btn-ghost" onClick={() => setEditing(null)} style={{ marginLeft: 8 }}>Cancel</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
