import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Loader2, UserPlus, ShieldAlert, Users, Trash2, AlertTriangle, X } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   Delete Confirmation Modal — 2-step
   Step 1: Warn admin what they're about to do
   Step 2: Type the username to confirm
───────────────────────────────────────────────────────────────────────── */
const DeleteUserModal = ({ target, onClose, onDeleted }) => {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async (e) => {
    e.preventDefault();
    if (confirmText !== target.username) return;
    setError(null);
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'profiles', target.id));
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
      <div style={{
        width: '460px',
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
                {target.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{target.username}</div>
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
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{target.username}</strong>'s account?
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
              <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{target.username}</strong>{' '}
              in the field below.
            </p>

            {error && (
              <div style={{
                padding: '0.75rem 1rem', backgroundColor: '#fee2e2', color: '#b91c1c',
                borderRadius: 'var(--radius-md)', fontSize: '0.875rem', border: '1px solid #fecaca',
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
                placeholder={target.username}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoFocus
                style={{ width: '100%' }}
              />
              {confirmText && confirmText !== target.username && (
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
                disabled={loading || confirmText !== target.username}
                style={{
                  flex: 1,
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontWeight: 600,
                  opacity: (loading || confirmText !== target.username) ? 0.5 : 1,
                  cursor: (loading || confirmText !== target.username) ? 'not-allowed' : 'pointer',
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


/* ─────────────────────────────────────────────────────────────────────────
   Team Page
───────────────────────────────────────────────────────────────────────── */
const Team = ({ currentUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [profiles, setProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null); // profile to delete

  useEffect(() => {
    if (currentUser?.role === 'admin') fetchProfiles();
  }, [currentUser]);

  const fetchProfiles = async () => {
    try {
      const profilesRef = collection(db, 'profiles');
      const q = query(profilesRef, orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      const data = [];
      snapshot.forEach((docSnap) => data.push({ id: docSnap.id, ...docSnap.data() }));
      setProfiles(data);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex-col items-center justify-center w-full h-full gap-4 text-center mt-12">
        <ShieldAlert size={48} className="text-secondary" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-secondary">Only administrators can manage team accounts.</p>
      </div>
    );
  }

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Use secondary app instance to avoid signing out the admin
      const secondaryAppName = 'SecondaryApp';
      const secondaryApp = getApps().find(a => a.name === secondaryAppName)
        || initializeApp({
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          }, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      const email = `${username.trim().toLowerCase()}@skillhubapp.com`;
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);

      await setDoc(doc(db, 'profiles', userCredential.user.uid), {
        username: username.trim().toLowerCase(),
        name: username.trim().toLowerCase(),
        role,
        created_at: new Date().toISOString(),
      });

      await firebaseSignOut(secondaryAuth);

      setSuccess(`Account for '${username}' created successfully!`);
      setUsername('');
      setPassword('');
      setRole('client');
      fetchProfiles();
    } catch (err) {
      if (err.message?.includes('already registered') || err.code === 'auth/email-already-in-use') {
        setError('That username is already taken. Please choose another.');
      } else {
        setError(err.message || 'Failed to create user account.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Called by modal after successful deletion
  const handleUserDeleted = (deletedId) => {
    setProfiles((prev) => prev.filter((p) => p.id !== deletedId));
    setDeleteTarget(null);
  };

  return (
    <div className="flex-col gap-6 animate-fade-in w-full max-w-4xl">
      {/* ── Create Account card ── */}
      <div className="card">
        <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserPlus size={20} /> Create New Account
          </h2>
          <p className="text-secondary text-sm">Generate access for new clients or team members.</p>
        </div>

        <form onSubmit={handleCreateUser} className="card-body flex-col gap-4">
          {error && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ padding: '0.75rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
              {success}
            </div>
          )}

          <div className="flex gap-4 w-full">
            <div className="flex-col gap-1.5 flex-1">
              <label className="text-sm font-bold">Username</label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. acme_client"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="flex-col gap-1.5 flex-1">
              <label className="text-sm font-bold">Account Role</label>
              <select
                className="input w-full"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ appearance: 'auto', outline: 'none' }}
              >
                <option value="client">Client (Restricted View)</option>
                <option value="developer">Developer (Full Access)</option>
                <option value="admin">Administrator (Global Access)</option>
              </select>
            </div>
          </div>

          <div className="flex-col gap-1.5 mt-4">
            <label className="text-sm font-bold">Temporary Password</label>
            <input
              type="password"
              className="input w-full"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-2"
              disabled={loading || !username || password.length < 6}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Create Account
            </button>
          </div>
        </form>
      </div>

      {/* ── Active Accounts table ── */}
      <div className="card">
        <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users size={20} /> Active Accounts
          </h2>
          <p className="text-secondary text-sm">Directory of all registered portal users.</p>
        </div>

        <div className="card-body">
          {loadingProfiles ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-secondary" /></div>
          ) : profiles.length === 0 ? (
            <div className="text-center p-8 text-secondary" style={{ border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              No profiles found.
            </div>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>Username</th>
                    <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>System Role</th>
                    <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>Joined Date</th>
                    <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => {
                    const isSelf = profile.id === currentUser.id;
                    return (
                      <tr
                        key={profile.id}
                        style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* Username */}
                        <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%',
                              backgroundColor: 'var(--bg-tertiary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                            }}>
                              {profile.username.charAt(0).toUpperCase()}
                            </div>
                            {profile.username}
                            {isSelf && (
                              <span style={{
                                fontSize: '0.65rem', fontWeight: 600,
                                backgroundColor: 'var(--btn-primary-bg)',
                                color: 'var(--btn-primary-text)',
                                borderRadius: '9999px', padding: '2px 8px',
                              }}>
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Role badge */}
                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                          <span className="badge" style={{
                            textTransform: 'capitalize',
                            backgroundColor:
                              profile.role === 'admin' ? '#fca5a5' :
                              profile.role === 'developer' ? '#bae6fd' :
                              'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                          }}>
                            {profile.role}
                          </span>
                        </td>

                        {/* Date */}
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {new Date(profile.created_at).toLocaleDateString()}
                        </td>

                        {/* Delete action */}
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {isSelf ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>—</span>
                          ) : (
                            <button
                              title={`Delete ${profile.username}`}
                              onClick={() => setDeleteTarget(profile)}
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(239,68,68,0.4)',
                                color: '#ef4444',
                                borderRadius: 'var(--radius-md)',
                                padding: '0.375rem 0.75rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.backgroundColor = '#ef4444';
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.border = '1px solid #ef4444';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#ef4444';
                                e.currentTarget.style.border = '1px solid rgba(239,68,68,0.4)';
                              }}
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteUserModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleUserDeleted}
        />
      )}
    </div>
  );
};

export default Team;
