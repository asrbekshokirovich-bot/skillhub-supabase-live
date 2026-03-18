import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { Trash2, AlertTriangle, X, Loader2, ShieldAlert } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   Delete Account Modal — 2-step confirmation
   Step 1: Warning + "Are you sure?" prompt
   Step 2: Password entry to complete deletion
───────────────────────────────────────────────────────────────────────── */
const DeleteAccountModal = ({ onClose, onDeleted }) => {
  const [step, setStep] = useState(1);      // 1 = confirm warning, 2 = enter password
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      // Delete Firestore profile first, then the auth account
      await deleteDoc(doc(db, 'profiles', user.uid));
      await deleteUser(user);
      onDeleted();
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/requires-recent-login') {
        setError('Session expired. Please log out, log back in, and try again.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div
        style={{
          width: '440px',
          backgroundColor: 'var(--bg-primary)',
          border: '1.5px solid #ef4444',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 60px rgba(239,68,68,0.2)',
          overflow: 'hidden',
          animation: 'slideUpFade 0.25s cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(239,68,68,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: '#ef4444' }}>
            <ShieldAlert size={20} />
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#ef4444' }}>
              {step === 1 ? 'Delete Account?' : 'Confirm Deletion'}
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', lineHeight: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step 1 — Warning */}
        {step === 1 && (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              display: 'flex', gap: '0.75rem',
            }}>
              <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                <strong style={{ color: '#ef4444', display: 'block', marginBottom: '0.25rem' }}>
                  This action is permanent and cannot be undone.
                </strong>
                Deleting your account will remove your profile, all your data, and revoke access immediately.
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Are you sure you want to permanently delete your account?
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{
                  flex: 1,
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontWeight: 600,
                }}
                onClick={() => setStep(2)}
              >
                Yes, Delete My Account
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Password Confirmation */}
        {step === 2 && (
          <form onSubmit={handleDelete} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Enter your password one last time to confirm. This is required to verify your identity before deletion.
            </p>

            {error && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                border: '1px solid #fecaca',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                Your Password
              </label>
              <input
                type="password"
                placeholder="Enter your current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => { setStep(1); setError(null); setPassword(''); }}
                disabled={loading}
              >
                ← Back
              </button>
              <button
                type="submit"
                className="btn"
                disabled={loading || !password}
                style={{
                  flex: 1,
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontWeight: 600,
                  opacity: (!password || loading) ? 0.6 : 1,
                  cursor: (!password || loading) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                {loading
                  ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  : <><Trash2 size={14} /> Delete Forever</>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};


/* ─────────────────────────────────────────────────────────────────────────
   Settings Page
───────────────────────────────────────────────────────────────────────── */
const Settings = ({ currentUser, theme, setTheme }) => {
  const [notifications, setNotifications] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }} className="animate-fade-in">

      {/* Page title */}
      <div>
        <h2 className="text-xl font-bold">Platform Settings</h2>
        <p className="text-secondary">Manage your account preferences and system configurations.</p>
      </div>

      {/* Profile Information */}
      <div className="card hover-elevate animate-slide-up" style={{ maxWidth: '600px', animationDelay: '100ms' }}>
        <div className="card-header">
          <h3 className="card-title">Profile Information</h3>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-sm font-bold">Display Name</label>
            <input type="text" defaultValue={currentUser.name} className="w-full" disabled />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-sm font-bold">Account Role</label>
            <input
              type="text"
              value={currentUser.role}
              className="w-full"
              disabled
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            />
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="card hover-elevate animate-slide-up" style={{ maxWidth: '600px', animationDelay: '200ms' }}>
        <div className="card-header">
          <h3 className="card-title">Preferences</h3>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Notifications */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span className="font-bold text-sm">Email Notifications</span>
              <span className="text-secondary" style={{ fontSize: '0.75rem' }}>Receive updates for assigned tasks</span>
            </div>
            <button
              className={`btn ${notifications ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1.5rem' }}
              onClick={() => setNotifications(!notifications)}
            >
              {notifications ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Appearance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span className="font-bold text-sm">Appearance</span>
              <span className="text-secondary" style={{ fontSize: '0.75rem' }}>Choose between light, dark, or system mode.</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {['light', 'dark', 'system'].map((t) => (
                <button
                  key={t}
                  className={`btn flex-1 ${theme === t ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTheme(t)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {t === 'system' ? 'System Auto' : t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save Changes */}
      <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
        <button className="btn btn-primary" style={{ padding: '0.625rem 2rem' }} onClick={() => alert('Settings saved successfully!')}>
          Save Changes
        </button>
      </div>

      {/* ── Danger Zone ─────────────────────────────────────────────────── */}
      <div
        className="card hover-elevate animate-slide-up"
        style={{
          maxWidth: '600px',
          animationDelay: '400ms',
          border: '1.5px solid #ef4444',
          marginTop: '0.5rem',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(239,68,68,0.25)',
          background: 'rgba(239,68,68,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <AlertTriangle size={16} color="#ef4444" />
          <h3 className="card-title" style={{ color: '#ef4444', margin: 0, fontSize: '1rem' }}>Danger Zone</h3>
        </div>

        {/* Body */}
        <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span className="font-bold text-sm">Delete Account</span>
            <span className="text-secondary" style={{ fontSize: '0.75rem', maxWidth: '340px' }}>
              Permanently remove your account and all associated data. This action cannot be undone.
            </span>
          </div>
          <button
            className="btn"
            onClick={() => setShowDeleteModal(true)}
            style={{
              backgroundColor: 'transparent',
              border: '1.5px solid #ef4444',
              color: '#ef4444',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
            }}
          >
            <Trash2 size={14} />
            Delete Account
          </button>
        </div>
      </div>

      {/* Modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
};

export default Settings;
