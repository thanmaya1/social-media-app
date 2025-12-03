import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/UI/Toast';
import { LocaleProvider } from './context/LocaleContext';
import './i18n/i18n';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <LocaleProvider>
        <BrowserRouter>
          <ToastProvider>
            <Layout>
              <App />
            </Layout>
          </ToastProvider>
        </BrowserRouter>
      </LocaleProvider>
    </AuthProvider>
  </React.StrictMode>,
);

// register service worker (best-effort)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        // eslint-disable-next-line no-console
        console.log('Service worker registered', reg.scope);

        // If there's an active waiting service worker, notify UI
        if (reg.waiting) {
          window.dispatchEvent(new CustomEvent('swUpdated', { detail: { registration: reg } }));
        }

        // listen for updates found and forward to UI when installed
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && reg.waiting) {
              window.dispatchEvent(new CustomEvent('swUpdated', { detail: { registration: reg } }));
            }
          });
        });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('Service worker registration failed', err);
      });
  });
}
