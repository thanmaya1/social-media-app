import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/auth';

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    try {
      await resetPassword(token, password);
      setStatus('Password reset. You can now log in.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      console.error(err);
      setStatus('Failed to reset password');
    }
  }

  return (
    <div className="container">
      <h2>Reset Password</h2>
      <form
        onSubmit={submit}
        style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480 }}
      >
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">
          Set password
        </button>
        {status && <div style={{ color: '#666' }}>{status}</div>}
      </form>
    </div>
  );
}
