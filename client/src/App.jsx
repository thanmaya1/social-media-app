import React, { useState } from 'react';
import useTheme from './hooks/useTheme';
import { Routes, Route, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Search from './pages/Search';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import OAuthCallback from './pages/OAuthCallback';
import Drafts from './pages/Drafts';
import Followers from './pages/Followers';
import Following from './pages/Following';
import Settings from './pages/Settings';
import NotificationSettings from './pages/NotificationSettings';
import { useToast } from './components/UI/Toast';
import Modal from './components/UI/Modal';

import NotificationBell from './components/NotificationBell';

function Nav() {
  const { user, loading } = useAuth();
  const isAdmin = !!(user && Array.isArray(user.roles) && user.roles.includes('admin'));
  // theme toggle
  const { theme, toggle } = useTheme();
  return (
    <nav
      style={{
        padding: 10,
        borderBottom: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <Link to="/">Home</Link> | <Link to="/login">Login</Link> |{' '}
        <Link to="/register">Register</Link> | <Link to="/messages">Messages</Link> |{' '}
        <Link to="/chat">Chat</Link> | <Link to="/drafts">Drafts</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <NotificationBell />
        <button className="btn btn-ghost" onClick={toggle} title="Toggle theme">
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
        {!loading && isAdmin ? (
          <>
            {' '}
            <Link to="/admin">Admin</Link>{' '}
          </>
        ) : null}
      </div>
    </nav>
  );
}

export default function App() {
  const toast = useToast();
  const [openDemoModal, setOpenDemoModal] = useState(false);

  return (
    <div>
      <Nav />

      <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-primary"
            onClick={() => toast.add('This is a beautiful toast', { title: 'Heads up' })}
          >
            Show Toast
          </button>
          <button className="btn btn-ghost" onClick={() => setOpenDemoModal(true)}>
            Open Modal
          </button>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/drafts" element={<Drafts />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/search" element={<Search />} />
        <Route path="/users/:id" element={<Profile />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/users/:id/followers" element={<Followers />} />
        <Route path="/users/:id/following" element={<Following />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/notifications" element={<NotificationSettings />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>

      <Modal open={openDemoModal} onClose={() => setOpenDemoModal(false)} title="Demo Modal">
        <p>
          This is a demo modal to show the polished UI. Use Escape to close and Tab to cycle focus.
        </p>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              toast.add('Saved!', { title: 'Success', type: 'success' });
              setOpenDemoModal(false);
            }}
          >
            Save
          </button>
          <button className="btn btn-ghost" onClick={() => setOpenDemoModal(false)}>
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
