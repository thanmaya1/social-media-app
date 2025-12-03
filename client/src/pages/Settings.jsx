import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getUser, updateProfile } from '../services/users';
import { useAuth } from '../context/AuthContext';
import api from '../services/users';
import { useToast } from '../components/UI/Toast';
import useLanguage from '../hooks/useLanguage';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useTranslation();
  const { language, changeLanguage, availableLanguages, languageNames } = useLanguage();
  const [settings, setSettings] = useState({});
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '' });

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, []);

  async function load() {
    try {
      const res = await fetch(`/api/users/${user.id}/settings`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const j = await res.json();
      setSettings(j.settings || {});
    } catch (err) {
      console.error(err);
    }
  }

  async function saveSettings() {
    try {
      const res = await fetch(`/api/users/${user.id}/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(settings),
      });
      const j = await res.json();
      setSettings(j.settings);
      try {
        toast.add('Settings saved', { type: 'success' });
      } catch (e) {}
    } catch (err) {
      console.error(err);
      try {
        toast.add('Failed to save settings', { type: 'error' });
      } catch (e) {}
    }
  }

  async function changePassword() {
    try {
      await fetch(`/api/users/${user.id}/password`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(passwords),
      });
      setPasswords({ oldPassword: '', newPassword: '' });
      try {
        toast.add('Password changed', { type: 'success' });
      } catch (e) {}
    } catch (err) {
      console.error(err);
      try {
        toast.add('Failed to change password', { type: 'error' });
      } catch (e) {}
    }
  }

  return (
    <div className="container">
      <h2>{t('settings.settings')}</h2>

      <div className="card">
        <h3>{t('settings.language')}</h3>
        <label>
          {t('settings.language')}:
          <select value={language} onChange={(e) => changeLanguage(e.target.value)}>
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {languageNames[lang]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>{t('notifications.settings')}</h3>
        <p style={{ marginTop: 0 }}>Manage your notification preferences and email subscriptions</p>
        <div style={{ marginTop: 12 }}>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/settings/notifications')}
          >
            Manage Notification Settings →
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>{t('settings.changePassword')}</h3>
        <input
          type="password"
          placeholder={t('settings.currentPassword')}
          value={passwords.oldPassword}
          onChange={(e) => setPasswords((p) => ({ ...p, oldPassword: e.target.value }))}
        />
        <input
          type="password"
          placeholder={t('settings.newPassword')}
          value={passwords.newPassword}
          onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
        />
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-primary" onClick={changePassword}>
            {t('settings.changePassword')}
          </button>
        </div>
      </div>
    </div>
  );
}
