import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const qp = new URLSearchParams(window.location.search);
    const accessToken = qp.get('accessToken');
    const refreshToken = qp.get('refreshToken');
    const returnedState = qp.get('state');
    const savedState = localStorage.getItem('oauth_state');

    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }

    // verify state when present (session-less flow). If mismatch, log warning.
    if (savedState) {
      if (!returnedState || returnedState !== savedState) {
        console.warn('OAuth state mismatch or missing — possible CSRF.');
      }
      localStorage.removeItem('oauth_state');
    }

    // Try to fetch current profile and set auth context
    (async () => {
      try {
        const res = await api.get('/profile');
        setUser(res.data.user || null);
      } catch (e) {
        // ignore
      } finally {
        // remove query params for cleanliness
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, document.title, url.toString());
        navigate('/');
      }
    })();
  }, [navigate, setUser]);

  return <div style={{ padding: 20 }}>Signing you in...</div>;
}
