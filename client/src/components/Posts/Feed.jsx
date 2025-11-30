import React, { useEffect, useState } from 'react';
import { getFeed, likePost } from '../../services/posts';

export default function Feed({ newPost }) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (newPost) setPosts(prev => [newPost, ...prev]);
  }, [newPost]);

  async function load() {
    setLoading(true);
    try {
      const res = await getFeed({ page });
      setPosts(prev => (page === 1 ? res.posts : [...prev, ...res.posts]));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLike(postId) {
    try {
      const res = await likePost(postId);
      setPosts(prev => prev.map(p => (p._id === res.post._id ? res.post : p)));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <h3>Feed</h3>
      {posts.length === 0 && <div>No posts yet</div>}
      {posts.map(p => (
        <div key={p._id} style={{ border: '1px solid #eee', padding: 8, marginBottom: 8 }}>
          <div style={{ fontWeight: 'bold' }}>{p.author?.username}</div>
          <div>{p.content}</div>
          {p.images && p.images.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {p.images.map((src, i) => (
                <img key={i} src={`${window.location.origin}${src}`} alt="post" style={{ maxWidth: 200, marginRight: 8 }} />
              ))}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <button onClick={() => handleLike(p._id)}>Like ({p.likes?.length || 0})</button>
          </div>
        </div>
      ))}
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button onClick={() => setPage(prev => prev + 1)} disabled={loading}>Load more</button>
      </div>
    </div>
  );
}
