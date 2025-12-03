import React, { useState } from 'react';
import axios from '../lib/axios';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/auth/login', { email, password });
      localStorage.setItem('accessToken', res.data.accessToken);
      if (onLogin) onLogin();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: '24px auto' }}>
        <h2 style={{ marginTop: 0 }}>Welcome back</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-md" type="submit">
              Login
            </button>
          </div>
        </form>
        <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
          <div style={{ marginBottom: 8 }}>Or sign in with</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                const state = Math.random().toString(36).slice(2);
                localStorage.setItem('oauth_state', state);
                window.location.href = `/api/auth/google?state=${encodeURIComponent(state)}`;
              }}
            >
              Continue with Google
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                const state = Math.random().toString(36).slice(2);
                localStorage.setItem('oauth_state', state);
                window.location.href = `/api/auth/github?state=${encodeURIComponent(state)}`;
              }}
            >
              Continue with GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
