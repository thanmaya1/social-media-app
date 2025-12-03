import React, { useEffect, useState } from 'react';
import PostCreate from '../components/Posts/PostCreate';
import Feed from '../components/Posts/Feed';
import { connectSocket, subscribe } from '../socket';

export default function Home() {
  const [newPost, setNewPost] = useState(null);

  useEffect(() => {
    const socket = connectSocket();
    const unsubNew = subscribe('new_post', (post) => {
      setNewPost(post);
    });
    const unsubLike = subscribe('post_liked', (data) => {
      console.log('post liked', data);
    });

    return () => {
      unsubNew();
      unsubLike();
    };
  }, []);

  return (
    <div>
      <div className="container">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <h1 style={{ margin: 0 }}>Home</h1>
        </div>
        <div className="card post-create">
          <PostCreate />
        </div>
        <div className="posts" style={{ marginTop: 16 }}>
          <Feed newPost={newPost} />
        </div>
      </div>
    </div>
  );
}
