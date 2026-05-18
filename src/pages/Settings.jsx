// ─────────────────────────────────────────────────────────────────────────
// Settings — preferences, appearance, danger zone (with delete-account flow).
//
// Drop-in replacement for src/pages/Settings.jsx.
// Same Supabase auth flow, same RPC ('delete_my_account'), same haptics,
// same useSystem toast.
// ─────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Trash2, AlertTriangle, X, Loader2, ShieldAlert,
  Sun, Moon, Monitor, Bell, User, Settings as SettingsIcon,
  Check,
} from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';
import { useSystem } from '../components/SystemUI';

// ─────────────────────────────────────────────────────────────────────────
// Delete Account Modal — 2-step (warning → password).
// ─────────────────────────────────────────────────────────────────────────

const DeleteAccountModal = ({ onClose, onDeleted, currentUser }) => {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async (e) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: currentUser.email, password,
      });
      if (authError) throw authError;
      const { error: rpcError } = await supabase.rpc('delete_my_account');
      if (rpcError) throw rpcError;
      await supabase.auth.signOut();
      triggerHaptic('heavy');
      onDeleted();
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Incorrect password. Please try again.'
        : err.message);
    } finally { setLoading(false); }
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(8,7,6,0.62)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}>
      <div className="bottom-sheet animate-slide-up"
        style={{
          width: '95vw', maxWidth: 440,
          background: 'var(--bg-primary)',
          border: '1px solid var(--alert-error-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--alert-error-border)',
          background: 'var(--alert-error-bg)',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--alert-error-text)' }}>
            <ShieldAlert size={16}/>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
              {step === 1 ? 'Delete account?' : 'Confirm deletion'}
            </span>
          </div>
          <button onClick={onClose} disabled={loading}
            style={{
              width: 26, height: 26, padding: 0, borderRadius: 'var(--radius-sm)',
              background: 'transparent', border: 'none', cursor: loading ? 'default' : 'pointer',
              color: 'var(--text-secondary)', opacity: loading ? 0.4 : 1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}><X size={14}/></button>
        </div>

        {/* Body */}
        {step === 1 ? (
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              padding: 12, borderRadius: 'var(--radius-md)',
              background: 'var(--alert-error-bg)', border: '1px solid var(--alert-error-border)',
              display: 'flex', gap: 10,
            }}>
              <AlertTriangle size={16} color="var(--alert-error-text)" style={{ flexShrink: 0, marginTop: 2 }}/>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--alert-error-text)', display: 'block', marginBottom: 2 }}>
                  This action is permanent and cannot be undone.
                </strong>
                Deleting your account removes your profile, all your data, and revokes access immediately.
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete your account?
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button className="btn" style={{
                flex: 1, background: 'var(--alert-error-text)', color: '#fff',
                border: 'none', fontWeight: 600,
              }} onClick={() => setStep(2)}>
                Yes, delete
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDelete}
            style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Enter your password to confirm. This verifies your identity before the account is removed.
            </p>
            {error && (
              <div style={{
                padding: '10px 12px', borderRadius: 'var(--radius-md)',
                background: 'var(--alert-error-bg)', color: 'var(--alert-error-text)',
                border: '1px solid var(--alert-error-border)',
                fontSize: '0.8125rem', fontWeight: 500,
              }}>{error}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}>Password</label>
              <input type="password" className="input" autoFocus required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your current password"/>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                onClick={() => { setStep(1); setError(null); setPassword(''); }}
                disabled={loading}>
                ← Back
              </button>
              <button type="submit" className="btn" disabled={loading || !password}
                style={{
                  flex: 1, background: 'var(--alert-error-text)', color: '#fff',
                  border: 'none', fontWeight: 600,
                  opacity: (!password || loading) ? 0.6 : 1,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                {loading ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={13}/>}
                {loading ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Settings page
// ─────────────────────────────────────────────────────────────────────────

const Settings = ({ currentUser, theme, setTheme }) => {
  const { toast } = useSystem();
  const [notifications, setNotifications] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <div className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', maxWidth: 720 }}>

      {/* HEADER */}
      <div>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.015em' }}>
          Settings
        </h2>
        <p style={{ marginTop: 4, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
          Account preferences and platform configuration.
        </p>
      </div>

      {/* PROFILE */}
      <Card>
        <CardHeader
          eyebrow={<><User size={12}/>Profile</>}
          title="Your account"
          subtitle="Read-only — provisioned by your project manager."
        />
        <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Display name">
            <input type="text" className="input" value={currentUser.name} disabled/>
          </Field>
          <Field label="Account role">
            <div style={{ display: 'flex' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 'var(--radius-md)',
                background: currentUser.role === 'ceo' ? 'var(--badge-ceo-bg)' : 'var(--badge-worker-bg)',
                color: currentUser.role === 'ceo' ? 'var(--badge-ceo-text)' : 'var(--badge-worker-text)',
                border: `1px solid ${currentUser.role === 'ceo' ? 'var(--badge-ceo-border)' : 'var(--badge-worker-border)'}`,
                fontSize: 12.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                {currentUser.role === 'ceo' ? 'CEO / Project Manager' : currentUser.role}
              </span>
            </div>
          </Field>
        </div>
      </Card>

      {/* PREFERENCES */}
      <Card>
        <CardHeader
          eyebrow={<><SettingsIcon size={12}/>Preferences</>}
          title="How Skillhub behaves"
        />
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Notifications */}
          <Row
            icon={<Bell size={16}/>}
            title="Email notifications"
            description="Receive updates when you're assigned to a task or @-mentioned."
            control={<Toggle on={notifications} onChange={setNotifications}/>}
          />

          <Divider/>

          {/* Theme */}
          <Row
            icon={<Sun size={16}/>}
            title="Appearance"
            description="Match your system or pick a fixed theme."
            control={<SegmentedTheme value={theme} onChange={setTheme}/>}
            stack
          />
        </div>

        <div style={{
          padding: '12px 18px', borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-primary)', display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button className="btn btn-primary"
            onClick={() => toast.success('Settings saved')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Check size={14}/>Save changes
          </button>
        </div>
      </Card>

      {/* DANGER ZONE */}
      <div style={{
        background: 'var(--alert-error-bg)',
        border: '1px solid var(--alert-error-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 18px', borderBottom: '1px solid var(--alert-error-border)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={14} color="var(--alert-error-text)"/>
          <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--alert-error-text)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Danger zone
          </h3>
        </div>
        <div style={{
          padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 14, background: 'var(--bg-primary)',
        }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Delete account
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Permanently remove your account and all associated data. This cannot be undone.
            </div>
          </div>
          <button onClick={() => setShowDeleteModal(true)}
            style={{
              padding: '7px 12px', borderRadius: 'var(--radius-md)',
              background: 'transparent', border: '1px solid var(--alert-error-border)',
              color: 'var(--alert-error-text)',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--alert-error-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <Trash2 size={13}/>Delete account
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          currentUser={currentUser}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────

const Card = ({ children }) => (
  <div style={{
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
  }}>{children}</div>
);

const CardHeader = ({ eyebrow, title, subtitle }) => (
  <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)' }}>
    {eyebrow && (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4,
      }}>{eyebrow}</div>
    )}
    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
    {subtitle && (
      <p style={{ margin: '3px 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{subtitle}</p>
    )}
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)',
    }}>{label}</label>
    {children}
  </div>
);

const Row = ({ icon, title, description, control, stack }) => (
  <div style={{
    display: 'flex', alignItems: stack ? 'flex-start' : 'center', justifyContent: 'space-between',
    gap: 14, flexWrap: 'wrap',
  }}>
    <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 220 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 'var(--radius-md)', flexShrink: 0,
        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
        color: 'var(--text-secondary)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {description}
        </div>
      </div>
    </div>
    <div style={{ flexShrink: 0, width: stack ? '100%' : 'auto', marginTop: stack ? 6 : 0 }}>
      {control}
    </div>
  </div>
);

const Divider = () => (
  <div style={{ height: 1, background: 'var(--border-color)' }}/>
);

// Proper iOS-style toggle switch
const Toggle = ({ on, onChange }) => (
  <button type="button" onClick={() => onChange(!on)}
    role="switch" aria-checked={on}
    style={{
      width: 42, height: 24, borderRadius: 999, padding: 2,
      background: on ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
      border: `1px solid ${on ? 'var(--accent-primary)' : 'var(--border-color)'}`,
      cursor: 'pointer', position: 'relative',
      transition: 'background 0.18s, border-color 0.18s',
    }}>
    <span style={{
      position: 'absolute', top: 2, left: on ? 20 : 2,
      width: 18, height: 18, borderRadius: '50%',
      background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      transition: 'left 0.18s cubic-bezier(0.16,1,0.3,1)',
    }}/>
  </button>
);

// Segmented theme picker — Light / Dark / System with icons
const SegmentedTheme = ({ value, onChange }) => {
  const opts = [
    { id: 'light',  label: 'Light',  icon: <Sun size={13}/> },
    { id: 'dark',   label: 'Dark',   icon: <Moon size={13}/> },
    { id: 'system', label: 'System', icon: <Monitor size={13}/> },
  ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
      padding: 4, background: 'var(--bg-primary)',
      border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
      width: '100%', maxWidth: 320,
    }}>
      {opts.map(o => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 10px', borderRadius: 'var(--radius-sm)',
            background: value === o.id ? 'var(--bg-secondary)' : 'transparent',
            color: value === o.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: value === o.id ? '1px solid var(--border-color)' : '1px solid transparent',
            boxShadow: value === o.id ? 'var(--shadow-sm)' : 'none',
            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s',
          }}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
};

export default Settings;
