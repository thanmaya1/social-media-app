import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import Icon from './Icon';
import { registerToast } from '../../lib/toastBridge';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const add = useCallback(
    (message, { duration = 3500, type = 'default', title } = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const t = { id, message, duration, type, title };
      setToasts((prev) => [t, ...prev]);
      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
      return id;
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ add, remove }}>
      {children}
      {/* register add function so non-react code (axios) can show toasts */}
      <ToastRegistrar add={add} />
      <div className="toast-root" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast card toast--${t.type || 'default'}`} role="status">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <Icon
                  name={
                    t.type === 'success'
                      ? 'check'
                      : t.type === 'error'
                      ? 'close'
                      : t.type === 'info'
                      ? 'bell'
                      : 'user'
                  }
                  style={{
                    width: 18,
                    height: 18,
                    color:
                      t.type === 'error'
                        ? 'var(--danger)'
                        : t.type === 'success'
                        ? 'var(--success)'
                        : 'var(--accent)',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                {t.title && <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.title}</div>}
                <div style={{ opacity: 0.95 }}>{t.message}</div>
              </div>
              <div>
                <button
                  aria-label="Dismiss"
                  className="btn btn-ghost btn-sm"
                  onClick={() => remove(t.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRegistrar({ add }) {
  useEffect(() => {
    registerToast(add);
    return () => registerToast(null);
  }, [add]);
  return null;
}

export default ToastProvider;
