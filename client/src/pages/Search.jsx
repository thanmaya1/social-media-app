import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../lib/axios';
import { searchUsers } from '../services/users';
import Avatar from '../components/UI/Avatar';
import { Link } from 'react-router-dom';

export default function Search() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('posts');

  useEffect(() => {
    search();
  }, [q]);

  async function search() {
    if (!q.trim()) return;
    setLoading(true);
    try {
      // If query is @username, prefer user search
      if (q.startsWith('@')) {
        const username = q.slice(1).trim();
        setTab('users');
        const usersRes = await searchUsers(username).catch(() => ({ users: [] }));
        setUsers(usersRes.users || []);
        setPosts([]);
        return;
      }

      // If query is #tag, search posts by tag
      if (q.startsWith('#')) {
        const tag = q.slice(1).trim();
        setTab('posts');
        const postsRes = await axios.get('/posts/search', { params: { tag } }).catch(() => ({ data: { posts: [] } }));
        setPosts(postsRes.data.posts || []);
        setUsers([]);
        return;
      }

      // default: search both
      const [postsRes, usersRes] = await Promise.all([
        axios.get('/posts/search', { params: { q } }).catch(() => ({ data: { posts: [] } })),
        searchUsers(q).catch(() => ({ users: [] })),
      ]);
      setPosts(postsRes.data.posts || []);
      setUsers(usersRes.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h2>Search Results for "{q}"</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          className={`btn ${tab === 'posts' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('posts')}
        >
          Posts ({posts.length})
        </button>
        <button
          className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('users')}
        >
          Users ({users.length})
        </button>
      </div>

      {loading && <div>Searching...</div>}

      {tab === 'posts' && (
        <div>
          {posts.length === 0 ? (
            <div style={{ color: '#999', padding: 20 }}>No posts found</div>
          ) : (
            posts.map((post) => (
              <article
                key={post._id}
                className="card"
                style={{ marginBottom: 16, padding: 16, display: 'flex', gap: 12 }}
              >
                <div style={{ width: 56 }}>
                  <Avatar
                    src={post.author?.profilePictureThumbs?.small || post.author?.profilePicture}
                    alt={post.author?.username}
                    size={56}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>
                    <Link to={`/users/${post.author?._id}`}>{post.author?.username}</Link>
                  </div>
                  <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{post.content}</div>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                    {new Date(post.createdAt).toLocaleString()}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {tab === 'users' && (
        <div>
          {users.length === 0 ? (
            <div style={{ color: '#999', padding: 20 }}>No users found</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {users.map((user) => (
                <Link
                  key={user._id}
                  to={`/users/${user._id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                    <Avatar
                      src={user.profilePictureThumbs?.small || user.profilePicture}
                      alt={user.username}
                      size={80}
                      style={{ margin: '0 auto' }}
                    />
                    <div style={{ fontWeight: 700, marginTop: 12 }}>
                      {user.username} {user.isVerified && <span title="Verified">✅</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{user.bio}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
