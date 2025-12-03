import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/UI/Toast';
import axios from '../lib/axios';

export default function NotificationSettings() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const [prefs, setPrefs] = useState({
    emailLikes: true,
    emailComments: true,
    emailFollows: true,
    pushMessages: true,
    emailMentions: true,
    emailMessages: true,
    pushMentions: true,
    pushMessagesAll: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      setLoading(true);
      const res = await axios.get(`/users/${user?.id}/settings`);
      setPrefs(res.data.settings || prefs);
    } catch (err) {
      console.error('Failed to load notification settings:', err);
      toast?.add?.('Failed to load settings', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    try {
      setSaving(true);
      await axios.put(`/users/${user?.id}/settings`, prefs);
      toast?.add?.('Notification settings saved', { type: 'success' });
    } catch (err) {
      console.error('Failed to save notification settings:', err);
      toast?.add?.('Failed to save settings', { type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const handleToggle = (key) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  if (loading) {
    return (
      <div className="container">
        <h2>{t('notifications.settings')}</h2>
        <div className="card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2>{t('notifications.settings')}</h2>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Email Notifications</h3>
          <p style={{ color: '#999', marginBottom: 16 }}>Receive email alerts for:</p>

          <label style={{ display: 'flex', alignItems: 'center', marginBottom: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.emailLikes}
              onChange={() => handleToggle('emailLikes')}
              style={{ marginRight: 8 }}
            />
            <span>
              <strong>Likes on your posts</strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Get notified when someone likes your post</p>
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', marginBottom: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.emailComments}
              onChange={() => handleToggle('emailComments')}
              style={{ marginRight: 8 }}
            />
            <span>
              <strong>Comments on your posts</strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Get notified when someone comments</p>
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', marginBottom: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.emailMentions}
              onChange={() => handleToggle('emailMentions')}
              style={{ marginRight: 8 }}
            />
            <span>
              <strong>Mentions</strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Get notified when someone mentions you</p>
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', marginBottom: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.emailMessages}
              onChange={() => handleToggle('emailMessages')}
              style={{ marginRight: 8 }}
            />
            <span>
              <strong>Direct messages</strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Get notified when you receive direct messages</p>
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', marginBottom: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.emailFollows}
              onChange={() => handleToggle('emailFollows')}
              style={{ marginRight: 8 }}
            />
            <span>
              <strong>New followers</strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Get notified when someone follows you</p>
            </span>
          </label>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Push Notifications</h3>
          <p style={{ color: '#999', marginBottom: 16 }}>Receive push alerts for:</p>

          <label style={{ display: 'flex', alignItems: 'center', marginBottom: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.pushMentions}
              onChange={() => handleToggle('pushMentions')}
              style={{ marginRight: 8 }}
            />
            <span>
              <strong>Mentions</strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Push notification when mentioned</p>
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', marginBottom: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.pushMessages}
              onChange={() => handleToggle('pushMessages')}
              style={{ marginRight: 8 }}
            />
            <span>
              <strong>Direct messages (one-on-one)</strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Push notification for direct messages</p>
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', marginBottom: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.pushMessagesAll}
              onChange={() => handleToggle('pushMessagesAll')}
              style={{ marginRight: 8 }}
            />
            <span>
              <strong>All messages (including groups)</strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Push notification for all message types</p>
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={savePreferences}
            disabled={saving}
            style={{ flex: 1 }}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={loadPreferences}
            disabled={saving}
            style={{ flex: 1 }}
          >
            Reset to Saved
          </button>
        </div>
      </div>
    </div>
  );
}
