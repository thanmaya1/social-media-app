import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFollowing } from '../services/users';

export default function Following() {
  const { id } = useParams();
  const [following, setFollowing] = useState([]);

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [id]);

  async function load() {
    try {
      const res = await getFollowing(id);
      setFollowing(res.following || []);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="container">
      <h2>Following</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {following.map((f) => (
          <div key={f._id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <img
              src={f.profilePictureThumbs?.small || f.profilePicture || '/default-avatar.png'}
              alt={f.username}
              style={{ width: 40, height: 40, borderRadius: 20 }}
            />{' '}
            <div>{f.username}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
