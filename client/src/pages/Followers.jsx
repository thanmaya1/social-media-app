import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFollowers } from '../services/users';

export default function Followers() {
  const { id } = useParams();
  const [followers, setFollowers] = useState([]);

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [id]);

  async function load() {
    try {
      const res = await getFollowers(id);
      setFollowers(res.followers || []);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="container">
      <h2>Followers</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {followers.map((f) => (
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
