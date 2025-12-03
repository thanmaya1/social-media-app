import React, { useState } from 'react';
import { follow, unfollow } from '../../services/users';

export default function FollowButton({ targetId, initialFollowing = false, disabled = false }) {
  const [following, setFollowing] = useState(!!initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading || disabled) return;
    setLoading(true);
    // optimistic update
    const prev = following;
    setFollowing(!prev);
    try {
      if (prev) await unfollow(targetId);
      else await follow(targetId);
    } catch (err) {
      // revert on error
      console.error(err);
      setFollowing(prev);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className={`btn ${following ? 'btn-outline' : 'btn-primary'}`}
      onClick={toggle}
      disabled={loading || disabled}
      aria-pressed={following}
      aria-busy={loading}
      aria-disabled={disabled}
      title={disabled ? 'Action unavailable' : ''}
    >
      {loading ? '…' : following ? 'Following' : 'Follow'}
    </button>
  );
}
