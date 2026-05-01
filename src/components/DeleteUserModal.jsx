import React, { useState } from 'react';
import { Loader2, AlertTriangle, X, Trash2 } from 'lucide-react';
import { userService } from '../lib/services/userService';

const DeleteUserModal = ({ target, onClose, onDeleted }) => {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async (e) => {
    e.preventDefault();
    if (confirmText !== target.name) return;
    setError(null);
    setLoading(true);
    try {
      await userService.deleteProfile(target.id);
      onDeleted(target.id);
    } catch (err) {
      setError('Failed to delete account: ' + err.message);
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
        className="bottom-sheet"
        style={{
        width: '95vw',
        maxWidth: '460px',
        backgroundColor: 'var(--bg-primary)',
        border: '1.5px solid #ef4444',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 60px rgba(239,68,68,0.2)',
        overflow: 'hidden',
        animation: 'slideUpFade 0.25s cubic-bezier(0.16,1,0.3,1) forwards',
      }}>

        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(239,68,68,0.25)',
          background: 'rgba(239,68,68,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: '#ef4444' }}>
            <AlertTriangle size={20} />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>
              {step === 1 ? 'Delete User Account?' : 'Confirm Deletion'}
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

        {/* ── Step 1: Warning ── */}
        {step === 1 && (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* User info chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.875rem 1rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                backgroundColor: '#fca5a5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '1rem', color: '#7f1d1d', flexShrink: 0,
              }}>
                {target.name ? target.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{target.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {target.role}
                </div>
              </div>
            </div>

            {/* Warning box */}
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              display: 'flex', gap: '0.75rem',
            }}>
              <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                <strong style={{ color: '#ef4444', display: 'block', marginBottom: '0.25rem' }}>
                  This action is permanent.
                </strong>
                The user's profile will be deleted from the system. They will no longer be able to access the portal.
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{target.name}</strong>'s account?
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn"
                style={{ flex: 1, backgroundColor: '#ef4444', color: '#fff', fontWeight: 600 }}
                onClick={() => setStep(2)}
              >
                Yes, Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Type username to confirm ── */}
        {step === 2 && (
          <form onSubmit={handleDelete} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              To confirm, type the username{' '}
              <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{target.name}</strong>{' '}
              in the field below.
            </p>

            {error && (
              <div style={{
                padding: '0.75rem 1rem', backgroundColor: 'var(--alert-error-bg)', color: 'var(--alert-error-text)',
                borderRadius: 'var(--radius-md)', fontSize: '0.875rem', border: '1px solid var(--alert-error-border)',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                Username confirmation
              </label>
              <input
                type="text"
                placeholder={target.name}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoFocus
                style={{ width: '100%' }}
              />
              {confirmText && confirmText !== target.name && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                  Doesn't match. Keep typing…
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => { setStep(1); setConfirmText(''); setError(null); }}
                disabled={loading}
              >
                ← Back
              </button>
              <button
                type="submit"
                className="btn"
                disabled={loading || confirmText !== target.name}
                style={{
                  flex: 1,
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontWeight: 600,
                  opacity: (loading || confirmText !== target.name) ? 0.5 : 1,
                  cursor: (loading || confirmText !== target.name) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                {loading
                  ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  : <><Trash2 size={14} /> Delete Account</>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
export default DeleteUserModal;
