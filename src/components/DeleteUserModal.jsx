// ─────────────────────────────────────────────────────────────────────────
// DeleteUserModal — token-driven, 2-step (warning → type-to-confirm).
// Drop-in replacement. Same userService.deleteProfile call, same props.
// ─────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Loader2, AlertTriangle, X, Trash2, ShieldAlert } from 'lucide-react';
import { userService } from '../lib/services/userService';

const DeleteUserModal = ({ target, onClose, onDeleted }) => {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const matchesName = confirmText === target.name;

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!matchesName) return;
    setError(null); setLoading(true);
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
    <div onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(8,7,6,0.62)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}>
      <div className="bottom-sheet animate-slide-up"
        style={{
          width: '95vw', maxWidth: 460,
          background: 'var(--bg-primary)',
          border: '1px solid var(--alert-error-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}>

        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--alert-error-border)',
          background: 'var(--alert-error-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--alert-error-text)' }}>
            <ShieldAlert size={16}/>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
              {step === 1 ? 'Delete user account?' : 'Confirm deletion'}
            </span>
          </div>
          <button onClick={onClose} disabled={loading}
            style={{
              width: 26, height: 26, padding: 0, borderRadius: 'var(--radius-sm)',
              background: 'transparent', border: 'none',
              cursor: loading ? 'default' : 'pointer',
              color: 'var(--text-secondary)', opacity: loading ? 0.4 : 1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}><X size={14}/></button>
        </div>

        {/* Step 1 — Warning */}
        {step === 1 ? (
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* User card */}
            <div style={{
              padding: '10px 12px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'var(--alert-error-bg)', color: 'var(--alert-error-text)',
                border: '1px solid var(--alert-error-border)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14, textTransform: 'uppercase',
              }}>
                {(target.name || '?').charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>{target.name}</div>
                <div style={{
                  fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 700,
                  letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 2,
                }}>
                  {target.role === 'ceo' ? 'CEO' : target.role}
                </div>
              </div>
            </div>

            {/* Warning */}
            <div style={{
              padding: 12, borderRadius: 'var(--radius-md)',
              background: 'var(--alert-error-bg)', border: '1px solid var(--alert-error-border)',
              display: 'flex', gap: 10,
            }}>
              <AlertTriangle size={16} color="var(--alert-error-text)" style={{ flexShrink: 0, marginTop: 2 }}/>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--alert-error-text)', display: 'block', marginBottom: 2 }}>
                  This action is permanent.
                </strong>
                The user's profile will be deleted from the system. They will no longer be able to access the portal.
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{target.name}</strong>'s account?
            </p>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button className="btn" style={{
                flex: 1, background: 'var(--alert-error-text)', color: '#fff',
                border: 'none', fontWeight: 600,
              }} onClick={() => setStep(2)}>
                Yes, continue
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDelete}
            style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              To confirm, type the username{' '}
              <strong style={{
                color: 'var(--text-primary)', fontFamily: 'ui-monospace, Menlo, monospace',
                padding: '1px 6px', borderRadius: 4,
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                fontSize: '0.8125rem',
              }}>{target.name}</strong>{' '}
              below.
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
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: 'var(--text-tertiary)',
              }}>Username confirmation</label>
              <input
                type="text"
                placeholder={target.name}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  border: `1px solid ${
                    !confirmText ? 'var(--border-color)' :
                    matchesName  ? 'var(--accent-success-text)' :
                                    'var(--alert-error-border)'
                  }`,
                  boxShadow: matchesName ? '0 0 0 1px var(--accent-success-text)' : 'none',
                }}
              />
              {confirmText && !matchesName && (
                <span style={{ fontSize: 11, color: 'var(--alert-error-text)' }}>
                  Doesn't match. Keep typing…
                </span>
              )}
              {matchesName && (
                <span style={{ fontSize: 11, color: 'var(--accent-success-text)', fontWeight: 600 }}>
                  ✓ Match — ready to delete
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                onClick={() => { setStep(1); setConfirmText(''); setError(null); }}
                disabled={loading}>
                ← Back
              </button>
              <button type="submit" className="btn" disabled={loading || !matchesName}
                style={{
                  flex: 1, background: 'var(--alert-error-text)', color: '#fff',
                  border: 'none', fontWeight: 600,
                  opacity: (!matchesName || loading) ? 0.5 : 1,
                  cursor: (!matchesName || loading) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                {loading ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={13}/>}
                {loading ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default DeleteUserModal;
