import React, { useState, useEffect } from 'react';
import axios from '../lib/axios';

function CreatePost({ onCreated }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('content', text);
    if (files) {
      for (let i = 0; i < files.length; i++) form.append('files', files[i]);
    }
    await axios.post('/posts', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    setText('');
    setFiles(null);
    if (onCreated) onCreated();
  };

  return (
    <form onSubmit={submit} className="create-post">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's happening?"
      />
      <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
      <button type="submit">Post</button>
    </form>
  );
}

export default function Feed() {
  const [posts, setPosts] = useState([]);

  const load = async () => {
    try {
      const res = await axios.get('/posts');
      setPosts(res.data.posts || []);
    } catch (e) {}
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="container">
      <h2>Feed</h2>
      <CreatePost onCreated={load} />
      <div className="posts">
        {posts.map((p) => (
          <div key={p._id} className="post">
            <div className="post-author">{p.author?.username}</div>
            <div className="post-content">{p.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
