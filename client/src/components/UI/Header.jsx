import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Icon from './Icon';
import NotificationBell from '../NotificationBell';
import LanguageSelector from './LanguageSelector';

export default function Header() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = !!(user && Array.isArray(user.roles) && user.roles.includes('admin'));
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navRef = useRef(null);
  const toggleRef = useRef(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 900 : false
  );

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onResize() {
      setIsMobile(window.innerWidth < 900);
    }

    window.addEventListener('resize', onResize);
    if (open) {
      document.addEventListener('keydown', onKey);
      // focus first link in nav for keyboard users
      const first = navRef.current && navRef.current.querySelector('a');
      if (first) first.focus();
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    setSearchQuery('');
  }

  return (
    <header className="site-header" data-open={open}>
      <div className="container header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            ref={toggleRef}
            className="mobile-nav-toggle btn btn-ghost btn-sm"
            aria-expanded={open}
            aria-controls="main-navigation"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name="menu" style={{ color: 'var(--muted)' }} />
          </button>
          <div className="brand">Socials</div>
        </div>

        <nav
          id="main-navigation"
          ref={navRef}
          className="main-nav"
          role="navigation"
          aria-hidden={!open && isMobile}
        >
          <Link to="/">
            <Icon name="home" style={{ marginRight: 8, color: 'var(--muted)' }} />
            Home
          </Link>
          <Link to="/messages">
            <Icon name="messages" style={{ marginRight: 8, color: 'var(--muted)' }} />
            Messages
          </Link>
          <Link to="/chat">
            <Icon name="chat" style={{ marginRight: 8, color: 'var(--muted)' }} />
            Chat
          </Link>
          <NotificationBell />
          {!loading && isAdmin ? (
            <Link to="/admin">
              <Icon name="admin" style={{ marginRight: 8, color: 'var(--muted)' }} />
              Admin
            </Link>
          ) : null}
        </nav>

        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 300, marginLeft: 20, marginRight: 20 }}>
          <input
            type="search"
            placeholder="Search posts & users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}
          />
          <button type="submit" className="btn btn-ghost btn-sm" title="Search">
            <Icon name="search" />
          </button>
        </form>

        <div className="header-actions">
          <div style={{ marginRight: 12 }}>
            <LanguageSelector />
          </div>
          {user ? (
            <Link to={`/users/${user._id}`} className="profile-link">
              {user.username || user.email}
            </Link>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}
