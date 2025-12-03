import React, { useEffect, useState } from 'react';
import { getComments, createComment, likeComment } from '../../services/comments';
import { createReport } from '../../services/reports';
import CommentForm from './CommentForm';

function CommentItem({ c, onLike, disabled = false }) {
  const [reporting, setReporting] = useState(false);

  async function handleReport() {
    const reason = window.prompt('Report reason (spam, harassment, hate speech, etc.):');
    if (!reason) return;
    try {
      setReporting(true);
      await createReport({ targetType: 'comment', targetId: c._id, reason });
      alert('Report submitted. Thank you for helping keep our community safe.');
    } catch (err) {
      console.error(err);
      alert('Failed to submit report');
    } finally {
      setReporting(false);
    }
  }

  return (
    <div className="comment-item" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ width: 40 }}>
        <img
          src={c.author?.profilePictureThumbs?.small || c.author?.profilePicture || '/default-avatar.png'}
          alt={c.author?.username}
          style={{ width: 40, height: 40, borderRadius: 20 }}
        />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>
          {c.author?.username}{' '}
          <span style={{ fontWeight: 400, color: '#666', fontSize: 12 }}>
            {new Date(c.createdAt).toLocaleString()}
          </span>
        </div>
        <div style={{ whiteSpace: 'pre-wrap' }}>{c.content}</div>
        <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => !disabled && onLike(c._id)}
            disabled={disabled}
            aria-disabled={disabled}
            title={disabled ? 'Action unavailable' : ''}
          >
            Like ({c.likes?.length || 0})
          </button>
          {!disabled && (
            <button
              className="btn btn-ghost btn-xs"
              onClick={handleReport}
              disabled={reporting}
              style={{ color: '#c33' }}
            >
              {reporting ? 'Reporting...' : 'Report'}
            </button>
          )}
          {disabled && (
            <span style={{ marginLeft: 8, color: '#c33', fontSize: 12 }}>Action unavailable</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommentsList({ postId, disabled = false }) {
  const [comments, setComments] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [page]);

  async function load() {
    setLoading(true);
    try {
      const res = await getComments(postId, { page });
      setComments((prev) => (page === 1 ? res.comments : [...prev, ...res.comments]));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fd) {
    try {
      const res = await createComment(postId, fd);
      setComments((prev) => [res.comment, ...prev]);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleLike(commentId) {
    try {
      const res = await likeComment(postId, commentId);
      setComments((prev) => prev.map((c) => (c._id === res.comment._id ? res.comment : c)));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="comments">
      {!disabled && <CommentForm onSubmit={handleCreate} disabled={disabled} />}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {comments.map((c) => (
          <CommentItem key={c._id} c={c} onLike={handleLike} disabled={disabled} />
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={loading}
        >
          Load more
        </button>
      </div>
    </div>
  );
}
