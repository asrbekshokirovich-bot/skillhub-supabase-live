import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

// ─── Toast Context ────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

let toastCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const confirmResolveRef = useRef(null);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  };

  // Returns a Promise<boolean> — resolves true on confirm, false on cancel
  const showConfirm = useCallback((message, title = 'Are you sure?') => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirm({ message, title });
    });
  }, []);

  const handleConfirmResolve = (result) => {
    setConfirm(null);
    if (confirmResolveRef.current) {
      confirmResolveRef.current(result);
      confirmResolveRef.current = null;
    }
  };

  return (
    <ToastContext.Provider value={{ toast, showConfirm }}>
      {children}

      {/* ── Confirm Dialog ─────────────────────────────────────────────── */}
      {confirm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            padding: '1rem',
          }}
        >
          <div
            className="animate-slide-up"
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              padding: '1.75rem',
              maxWidth: '400px',
              width: '100%',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              {confirm.title}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {confirm.message}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => handleConfirmResolve(false)}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={() => handleConfirmResolve(true)}
                style={{
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Stack ──────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <Toast key={t.id} toast={t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// ─── Single Toast ─────────────────────────────────────────────────────────────
const TOAST_STYLES = {
  success: { bg: 'var(--accent-success-muted)', text: 'var(--accent-success-text)', border: 'var(--accent-success-border)', icon: '✓' },
  error:   { bg: 'var(--alert-error-bg)',        text: 'var(--alert-error-text)',    border: 'var(--alert-error-border)',   icon: '✕' },
  info:    { bg: 'var(--bg-secondary)',           text: 'var(--text-primary)',        border: 'var(--border-color)',         icon: 'i' },
};

const Toast = ({ toast }) => {
  const s = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  return (
    <div
      className="animate-slide-up"
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.875rem 1.25rem',
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        fontSize: '0.875rem',
        fontWeight: 500,
        minWidth: '260px',
        maxWidth: '360px',
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: '50%',
        backgroundColor: s.text, color: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
      }}>
        {s.icon}
      </span>
      {toast.message}
    </div>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useSystem = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useSystem must be used inside ToastProvider');
  return ctx;
};
