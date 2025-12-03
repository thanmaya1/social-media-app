import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getUser, updateProfile, uploadAvatar, uploadCover, getFollowers, getFollowing } from '../services/users';
import { createReport } from '../services/reports';
import Avatar from '../components/UI/Avatar';
import FollowButton from '../components/User/FollowButton';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [blockedByCurrentUser, setBlockedByCurrentUser] = useState(false);
  const [blockedCurrentUser, setBlockedCurrentUser] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: '', bio: '', location: '', website: '' });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [reportingUser, setReportingUser] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loadingFollows, setLoadingFollows] = useState(false);

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [id]);

  useEffect(() => {
    loadFollows(); /* eslint-disable-next-line */
  }, [id]);

  async function loadFollows() {
    if (!id) return;
    try {
      setLoadingFollows(true);
      const [followerRes, followingRes] = await Promise.all([
        getFollowers(id).catch(() => ({ users: [] })),
        getFollowing(id).catch(() => ({ users: [] })),
      ]);
      setFollowers(followerRes.users || []);
      setFollowing(followingRes.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFollows(false);
    }
  }

  async function load() {
    try {
      const res = await getUser(id);
      setUser(res.user);
      setBlockedByCurrentUser(!!res.blockedByCurrentUser);
      setBlockedCurrentUser(!!res.blockedCurrentUser);
      setForm({
        username: res.user.username || '',
        bio: res.user.bio || '',
        location: res.user.location || '',
        website: res.user.website || '',
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function save() {
    try {
      const res = await updateProfile(id, form);
      setUser(res.user);
      setEditing(false);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAvatar(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // show preview
    try {
      setAvatarPreview(URL.createObjectURL(f));
      setUploadingAvatar(true);
      const res = await uploadAvatar(id, f);
      setUser(res.user);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingAvatar(false);
      // revoke preview after a short delay so browser can render uploaded image
      setTimeout(() => {
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }, 1500);
    }
  }

  async function handleCover(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      setCoverPreview(URL.createObjectURL(f));
      setUploadingCover(true);
      const res = await uploadCover(id, f);
      setUser(res.user);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingCover(false);
      setTimeout(() => {
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setCoverPreview(null);
      }, 1500);
    }
  }

  async function submitReport() {
    if (!reportReason.trim()) {
      alert('Please provide a reason');
      return;
    }
    try {
      setReportingUser(true);
      await createReport({ targetType: 'user', targetId: user._id, reason: reportReason });
      alert('Report submitted. Thank you for helping keep our community safe.');
      setReportReason('');
    } catch (err) {
      console.error(err);
      alert('Failed to submit report');
    } finally {
      setReportingUser(false);
    }
  }

  if (!user) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              height: 200,
              background: '#eee',
              borderRadius: 8,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {(coverPreview || user.coverImage || user.coverImageThumbs?.medium) && (
              <img
                src={
                  // prefer preview, then medium thumb, then original cover image
                  (coverPreview || user.coverImageThumbs?.medium || user.coverImage || '').startsWith('/')
                    ? `${window.location.origin}${coverPreview || user.coverImageThumbs?.medium || user.coverImage}`
                    : coverPreview || user.coverImageThumbs?.medium || user.coverImage
                }
                alt="cover"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            <div style={{ position: 'absolute', right: 8, bottom: 8 }}>
              <label className="btn btn-ghost btn-sm">
                {uploadingCover ? 'Uploading…' : 'Upload cover'}
                <input
                  type="file"
                  onChange={handleCover}
                  style={{ display: 'none' }}
                  disabled={uploadingCover}
                />
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: -32 }}>
            <Avatar
              src={
                avatarPreview || (user.profilePictureThumbs?.small || user.profilePicture)
              }
              alt={user.username}
              size={96}
            />
            <div>
              <h2 style={{ margin: 0 }}>
                {user.username} {user.isVerified && <span title="Verified">✅</span>}
              </h2>
              <div style={{ color: '#666' }}>{user.bio}</div>
              <div style={{ marginTop: 8, fontSize: 14, color: '#666', display: 'flex', gap: 16 }}>
                <div>
                  <strong>{followers.length}</strong> {followers.length === 1 ? 'Follower' : 'Followers'}
                </div>
                <div>
                  <strong>{following.length}</strong> Following
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                {!blockedByCurrentUser && !blockedCurrentUser && currentUser?._id !== user._id && (
                  <>
                    <FollowButton targetId={user._id} initialFollowing={false} />
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => {
                        if (!reportingUser) {
                          const reason = prompt('Report reason (spam, harassment, hate speech, etc.):');
                          if (reason) {
                            setReportReason(reason);
                            setTimeout(() => submitReport(), 0);
                          }
                        }
                      }}
                      disabled={reportingUser}
                      style={{ marginLeft: 8 }}
                    >
                      {reportingUser ? 'Reporting...' : 'Report'}
                    </button>
                  </>
                )}
                {blockedCurrentUser && (
                  <div style={{ color: 'red', fontSize: 12, marginTop: 6 }}>You are blocked by this user</div>
                )}
                {blockedByCurrentUser && (
                  <div style={{ color: 'red', fontSize: 12, marginTop: 6 }}>You have blocked this user</div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div style={{ width: 320 }}>
          <div className="card">
            <h3>Profile</h3>
            {editing ? (
              <div>
                <input
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                />
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                />
                <input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
                <input
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={save}>
                    Save
                  </button>
                  <button className="btn" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div>
                  <strong>Username:</strong> {user.username}
                </div>
                <div>
                  <strong>Location:</strong> {user.location}
                </div>
                <div>
                  <strong>Website:</strong> {user.website}
                </div>
                <div style={{ marginTop: 8 }}>
                  <label className="btn btn-ghost btn-sm">
                    Change avatar
                    <input type="file" onChange={handleAvatar} style={{ display: 'none' }} />
                  </label>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
