import React, { useState, useEffect } from 'react';
import Avatar from '../UI/Avatar';
import Icon from '../UI/Icon';
import FollowButton from '../User/FollowButton';
import { useAuth } from '../../context/AuthContext';
import CommentsList from '../Comments/CommentsList';
import { getUser } from '../../services/users';
import { createReport } from '../../services/reports';
import { sharePost } from '../../services/posts';
import { Link } from 'react-router-dom';

function renderContentWithLinks(content) {
  if (!content) return null;
  // split into text, @mentions and #hashtags
  const parts = content.split(/(@[A-Za-z0-9_]+|#[A-Za-z0-9_]+)/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('@')) {
      const username = part.slice(1);
      return (
        <Link key={i} to={`/search?q=@${encodeURIComponent(username)}`} className="mention-link">
          {part}
        </Link>
      );
    }
    if (part.startsWith('#')) {
      const tag = part.slice(1);
      return (
        <Link key={i} to={`/search?q=%23${encodeURIComponent(tag)}`} className="hashtag-link">
          {part}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function PostCard({ post, onLike }) {
  const [showComments, setShowComments] = useState(false);
  const { user } = useAuth();
  const [blockedByCurrentUser, setBlockedByCurrentUser] = useState(false);
  const [blockedCurrentUser, setBlockedCurrentUser] = useState(false);
  const disabled = blockedByCurrentUser || blockedCurrentUser;

  useEffect(() => {
    // Prefer batched relationship flags when available on the post
    if (post && typeof post.blockedByCurrentUser !== 'undefined') {
      setBlockedByCurrentUser(!!post.blockedByCurrentUser);
      setBlockedCurrentUser(!!post.blockedCurrentUser);
      return;
    }

    let mounted = true;
    async function fetchRelation() {
      try {
        if (!post.author || !user) return;
        const res = await getUser(post.author._id);
        if (!mounted) return;
        setBlockedByCurrentUser(!!res.blockedByCurrentUser);
        setBlockedCurrentUser(!!res.blockedCurrentUser);
      } catch (e) {
        // ignore
      }
    }
    fetchRelation();
    return () => {
      mounted = false;
    };
  }, [post, post.author, user]);
  return (
    <article
      className="card post-item"
      role="article"
      aria-labelledby={`post-${post._id}-title`}
      style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
    >
      <div style={{ width: 56 }}>
        <Avatar
          src={post.author?.profilePictureThumbs?.small || post.author?.profilePicture}
          alt={post.author?.username}
          size={56}
        />
      </div>
      <div className="post-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div id={`post-${post._id}-title`} style={{ fontWeight: 700 }}>
                {post.author?.username}
              </div>
              {post.author && user && user.id !== post.author._id && !disabled && (
                <div style={{ marginLeft: 8 }}>
                  <FollowButton targetId={post.author._id} />
                </div>
              )}
            </div>
            <div className="post-meta">{new Date(post.createdAt).toLocaleString()}</div>
          </div>
        </div>
        <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
          {renderContentWithLinks(post.content)}
        </div>
        {post.images && post.images.length > 0 && (
          <div className="post-images" style={{ marginTop: 8 }}>
            {post.images.map((src, i) => {
              const thumb = post.imageThumbs && post.imageThumbs[i] ? post.imageThumbs[i].small || post.imageThumbs[i].medium : null;
              const finalSrc = thumb ? (thumb.startsWith('/') ? `${window.location.origin}${thumb}` : thumb) : (src.startsWith('/') ? `${window.location.origin}${src}` : src);
              return (
                <img key={i} src={finalSrc} alt="post" className="img-zoom" />
              );
            })}
          </div>
        )}
        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          {!disabled ? (
            <button
              className="btn btn-ghost btn-sm"
              aria-label={`Like post by ${post.author?.username}`}
              onClick={() => onLike && onLike(post._id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
            <Icon
              name={post.liked ? 'heart_filled' : 'heart'}
              style={{ color: post.liked ? 'var(--danger)' : 'var(--muted)' }}
            />
            <span>Like ({post.likes?.length || 0})</span>
            </button>
          ) : (
            <div style={{ color: '#666', fontSize: 13 }}>Actions hidden</div>
          )}
          {!disabled ? (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowComments((s) => !s)}>
              <Icon name="comment" />
              <span>Comments ({post.comments?.length || 0})</span>
            </button>
          ) : null}
          {!disabled ? (
            <button
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                try {
                  const reason = window.prompt('Why are you reporting this post? (optional)');
                  if (!reason && reason !== '') return; // user cancelled
                  await createReport({ targetType: 'post', targetId: post._id, reason });
                  alert('Report submitted — thank you.');
                } catch (e) {
                  alert('Failed to submit report');
                }
              }}
            >
              Report
            </button>
          ) : null}
          {/** Share with optional comment */}
          {!disabled ? (
            <button
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                try {
                  const comment = window.prompt('Add a comment when sharing (optional)');
                  if (comment === null) return; // cancelled
                  await sharePost(post._id, comment || '');
                  alert('Post shared');
                } catch (e) {
                  alert('Failed to share post');
                }
              }}
            >
              <Icon name="share" />
              <span>Share</span>
            </button>
          ) : null}
        </div>
        {showComments && (
          <div style={{ marginTop: 12 }}>
            <CommentsList postId={post._id} disabled={disabled} />
          </div>
        )}
        {disabled && (
          <div style={{ color: '#c33', marginTop: 8, fontSize: 13 }}>Actions hidden due to block</div>
        )}
      </div>
    </article>
  );
}
