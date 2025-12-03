import React, { useState } from 'react';
import { forgotPassword } from '../services/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);

  async function submit(e) {
    e.preventDefault();
    try {
      await forgotPassword(email);
      setStatus('check your email for reset instructions');
    } catch (err) {
      console.error(err);
      setStatus('failed to send reset email');
    }
  }

  return (
    <div className="container">
      <h2>Forgot Password</h2>
      <form
        onSubmit={submit}
        style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480 }}
      >
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn btn-primary" type="submit">
          Send reset email
        </button>
        {status && <div style={{ color: '#666' }}>{status}</div>}
      </form>
    </div>
  );
}
