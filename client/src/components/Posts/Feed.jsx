import React, { useEffect, useState, useCallback } from 'react';
import { getFeed, likePost } from '../../services/posts';
import PostCard from './PostCard';
import Skeleton from '../UI/Skeleton';

let FixedSizeList;
try {
  // optional dependency: react-window
  // eslint-disable-next-line global-require
  FixedSizeList = require('react-window').FixedSizeList;
} catch (e) {
  FixedSizeList = null;
}

export default function Feed({ newPost }) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (newPost) setPosts((prev) => [newPost, ...prev]);
  }, [newPost]);

  async function load() {
    setLoading(true);
    try {
      const res = await getFeed({ page });
      setPosts((prev) => (page === 1 ? res.posts : [...prev, ...res.posts]));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLike(postId) {
    try {
      const res = await likePost(postId);
      setPosts((prev) => prev.map((p) => (p._id === res.post._id ? res.post : p)));
    } catch (err) {
      console.error(err);
    }
  }

  // Virtualized row renderer
  const Row = useCallback(
    ({ index, style }) => {
      const p = posts[index];
      if (!p) return null;
      return (
        <div style={{ ...style, paddingBottom: 12 }}>
          <PostCard post={p} onLike={handleLike} />
        </div>
      );
    },
    [posts]
  );

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Feed</h3>
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton height={140} />
          <Skeleton height={140} />
          <Skeleton height={140} />
        </div>
      )}
      {!loading && posts.length === 0 && <div>No posts yet</div>}
      {FixedSizeList && posts.length > 0 ? (
        <FixedSizeList
          height={Math.min(window.innerHeight - 200, 800)}
          itemCount={posts.length}
          itemSize={180}
          width="100%"
        >
          {Row}
        </FixedSizeList>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map((p) => (
            <PostCard key={p._id} post={p} onLike={handleLike} />
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button
          className="btn btn-ghost btn-md"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={loading}
        >
          Load more
        </button>
      </div>
    </div>
  );
}
