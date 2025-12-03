import React from 'react';
import Header from './UI/Header';
import SwUpdatePrompt from './UI/SwUpdatePrompt';

export default function Layout({ children }) {
  return (
    <div className="app-root">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header />
      <SwUpdatePrompt />
      <main id="main-content" className="container main-content">
        {children}
      </main>
      <footer className="site-footer">
        <div className="container">© {new Date().getFullYear()} Socials — Built with care</div>
      </footer>
    </div>
  );
}
