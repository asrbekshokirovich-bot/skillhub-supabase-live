// ─────────────────────────────────────────────────────────────────────────
// Login — clean, single-column, branded with the SH cube mark.
//
// Drop-in replacement for src/pages/Login.jsx.
// Same auth flow (Supabase email/password), same env-driven email domain.
// ─────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import logoMarkLight from '../assets/logo-mark-dark-256.png';
import logoMarkDark  from '../assets/logo-mark-white-256.png';

const Login = ({ isDark }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const AUTH_DOMAIN = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'skillhubapp.com';

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const trimmed = username.trim().toLowerCase();
      const email = trimmed.includes('@') ? trimmed : `${trimmed}@${AUTH_DOMAIN}`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Invalid username or password.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in"
      style={{
        minHeight: '100vh', width: '100%',
        background: 'var(--bg-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
        position: 'relative', overflow: 'hidden',
      }}>

      {/* soft ambient gradient — barely-there warm glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(900px 600px at 50% -10%, var(--accent-primary-muted), transparent 70%)',
      }}/>

      <div className="animate-slide-up"
        style={{
          position: 'relative', width: '100%', maxWidth: 420,
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '32px 28px',
          display: 'flex', flexDirection: 'column', gap: 24,
        }}>

        {/* Logo + heading */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
          <div style={{
            width: 60, height: 60, borderRadius: 14,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <img src={isDark ? logoMarkDark : logoMarkLight} alt="Skillhub"
              style={{ height: 38, width: 'auto', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; }}/>
          </div>
          <div>
            <h1 style={{
              margin: 0, fontSize: '1.375rem', fontWeight: 700,
              letterSpacing: '-0.015em', color: 'var(--text-primary)',
            }}>
              Sign in to Skillhub
            </h1>
            <p style={{
              margin: '6px 0 0 0', fontSize: '0.875rem',
              color: 'var(--text-secondary)', lineHeight: 1.5,
            }}>
              Enter your username and password to continue
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '10px 12px',
              background: 'var(--alert-error-bg)',
              border: '1px solid var(--alert-error-border)',
              color: 'var(--alert-error-text)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.5,
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }}/>
              <span>{error}</span>
            </div>
          )}

          <Field label="Username">
            <input
              type="text" className="input"
              placeholder="e.g. davrbek"
              value={username} onChange={(e) => setUsername(e.target.value)}
              inputMode="email" autoCapitalize="none" autoCorrect="off"
              required
              style={{ height: 42, fontSize: '0.9375rem' }}
            />
            <Hint>You can also paste a full email address</Hint>
          </Field>

          <Field label="Password">
            <input
              type="password" className="input"
              placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required
              style={{ height: 42, fontSize: '0.9375rem' }}
            />
          </Field>

          <button type="submit" className="btn btn-primary"
            disabled={loading || !username || !password}
            style={{
              height: 44, marginTop: 4,
              fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '-0.005em',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: (!username || !password || loading) ? 0.6 : 1,
            }}>
            {loading
              ? <><Loader2 size={16} className="animate-spin"/>Signing in…</>
              : 'Sign in'
            }
          </button>

          <button type="button"
            onClick={() => setError('Password reset is handled by your project manager — message them to receive a new temporary password.')}
            style={{
              padding: '4px 0', marginTop: -4,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-tertiary)',
              fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 500,
              textAlign: 'center', alignSelf: 'center',
              textDecoration: 'underline', textDecorationColor: 'var(--border-color)',
              textUnderlineOffset: 3,
            }}>
            Forgot your password?
          </button>
        </form>

        {/* Footer hint */}
        <div style={{
          paddingTop: 16, borderTop: '1px solid var(--border-color)',
          textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.5,
        }}>
          Need an account? Ask your project manager to provision one in <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Team</span>.
        </div>
      </div>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)',
    }}>{label}</label>
    {children}
  </div>
);

const Hint = ({ children }) => (
  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{children}</span>
);

export default Login;
