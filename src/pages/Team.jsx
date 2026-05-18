// ─────────────────────────────────────────────────────────────────────────
// Team — create-account form + active-accounts directory.
//
// Drop-in replacement for src/pages/Team.jsx.
// Same authService.createSecondaryUser + userService.getAllProfiles calls.
// Same DeleteUserModal trigger. CEO-only — non-CEOs see an access-denied state.
// ─────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { Loader2, UserPlus, ShieldAlert, Users, Trash2, Eye, EyeOff, Search } from 'lucide-react';
import { authService } from '../lib/services/authService';
import { userService } from '../lib/services/userService';
import DeleteUserModal from '../components/DeleteUserModal';

const Team = ({ currentUser }) => {
  // create form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('worker');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // accounts
  const [profiles, setProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    if (currentUser?.role === 'ceo') fetchProfiles();
  }, [currentUser]);

  const fetchProfiles = async () => {
    try {
      const data = await userService.getAllProfiles();
      setProfiles(data);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  if (currentUser?.role !== 'ceo') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 14, textAlign: 'center', padding: '4rem 1rem',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--alert-error-bg)', color: 'var(--alert-error-text)',
          border: '1px solid var(--alert-error-border)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldAlert size={22}/>
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Access denied
          </h2>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Only Project Managers / CEOs can manage team accounts.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    try {
      await authService.createSecondaryUser(username, role, password);
      setSuccess(`Account for '${username}' created successfully.`);
      setUsername(''); setPassword(''); setRole('worker');
      fetchProfiles();
    } catch (err) {
      setError(err.message || 'Failed to create user account.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserDeleted = (deletedId) => {
    setProfiles(prev => prev.filter(p => p.id !== deletedId));
    setDeleteTarget(null);
  };

  // password strength feedback (simple)
  const pwdStrength = (() => {
    if (!password) return { score: 0, label: '' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    const labels = ['Too short', 'Weak', 'OK', 'Good', 'Strong'];
    return { score, label: labels[score] || labels[0] };
  })();

  const filtered = profiles.filter(p => {
    if (roleFilter !== 'all' && p.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (p.name || '').toLowerCase().includes(q);
    }
    return true;
  });

  const ceoCount    = profiles.filter(p => p.role === 'ceo').length;
  const workerCount = profiles.filter(p => p.role === 'worker').length;
  const clientCount = profiles.filter(p => p.role === 'client').length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.015em' }}>Team</h2>
          <p style={{ marginTop: 4, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            {profiles.length} {profiles.length === 1 ? 'account' : 'accounts'} ·{' '}
            {ceoCount} CEO · {workerCount} worker{workerCount === 1 ? '' : 's'}
            {clientCount > 0 && <> · {clientCount} client{clientCount === 1 ? '' : 's'}</>}
          </p>
        </div>
      </div>

      {/* CREATE FORM */}
      <Card>
        <CardHeader
          eyebrow={<><UserPlus size={12}/>Provision new account</>}
          title="Create access"
          subtitle="Generate credentials for new clients or team members."
        />
        <form onSubmit={handleCreateUser} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <Alert tone="danger">
              {error}
            </Alert>
          )}
          {success && (
            <Alert tone="success">
              {success}
            </Alert>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Username">
              <input type="text" className="input"
                placeholder="e.g. acme_client"
                value={username} onChange={(e) => setUsername(e.target.value)}
                required
              />
            </Field>
            <Field label="Account role">
              <SegmentedRole value={role} onChange={setRole}/>
            </Field>
          </div>

          <Field label="Temporary password" hint="Min 6 characters">
            <div style={{ position: 'relative' }}>
              <input type={showPwd ? 'text' : 'password'} className="input"
                placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                minLength={6} required
                style={{ paddingRight: 38 }}
              />
              <button type="button" onClick={() => setShowPwd(s => !s)}
                title={showPwd ? 'Hide' : 'Show'}
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  width: 26, height: 26, borderRadius: 'var(--radius-sm)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-tertiary)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
            {password && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 99,
                      background: i < pwdStrength.score
                        ? (pwdStrength.score <= 1 ? 'var(--alert-error-text)'
                           : pwdStrength.score === 2 ? 'var(--accent-warning)'
                           : pwdStrength.score === 3 ? 'var(--accent-primary)'
                           : 'var(--accent-success)')
                        : 'var(--bg-tertiary)',
                      transition: 'background 0.15s',
                    }}/>
                  ))}
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 600, minWidth: 50, textAlign: 'right' }}>
                  {pwdStrength.label}
                </span>
              </div>
            )}
          </Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="submit" className="btn btn-primary"
              disabled={loading || !username || password.length < 6}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {loading ? <Loader2 size={14} className="animate-spin"/> : <UserPlus size={14}/>}
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      </Card>

      {/* ACTIVE ACCOUNTS */}
      <Card>
        <CardHeader
          eyebrow={<><Users size={12}/>Active accounts</>}
          title="Directory"
          subtitle={`${profiles.length} registered portal users.`}
          right={
            profiles.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <SearchBox value={search} onChange={setSearch}/>
              </div>
            )
          }
        />

        {/* role filter chips */}
        {profiles.length > 0 && (
          <div style={{
            padding: '8px 16px', borderBottom: '1px solid var(--border-color)',
            display: 'flex', gap: 4,
          }}>
            {[
              { id: 'all',    label: 'All',    count: profiles.length },
              { id: 'ceo',    label: 'CEO',    count: ceoCount },
              { id: 'worker', label: 'Worker', count: workerCount },
              { id: 'client', label: 'Client', count: clientCount },
            ].map(t => (
              <button key={t.id} onClick={() => setRoleFilter(t.id)}
                style={{
                  padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                  background: roleFilter === t.id ? 'var(--bg-tertiary)' : 'transparent',
                  color: roleFilter === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: roleFilter === t.id ? '1px solid var(--border-color)' : '1px solid transparent',
                  fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 600,
                  cursor: 'pointer',
                }}>
                {t.label}
                <span style={{ marginLeft: 6, color: 'var(--text-tertiary)', fontWeight: 500 }}>{t.count}</span>
              </button>
            ))}
          </div>
        )}

        {loadingProfiles ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Loader2 className="animate-spin" size={20} style={{ color: 'var(--text-tertiary)' }}/>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={26}/>}
            title="No accounts match"
            body="Adjust the filter or search above."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th>Role</Th>
                  <Th>Joined</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((profile, i, arr) => {
                  const isSelf = profile.id === currentUser.id;
                  const role = profile.role;
                  const roleColors = role === 'ceo'
                    ? { bg: 'var(--badge-ceo-bg)',    fg: 'var(--badge-ceo-text)',    br: 'var(--badge-ceo-border)' }
                    : role === 'client'
                    ? { bg: 'var(--bg-tertiary)',     fg: 'var(--text-secondary)',    br: 'var(--border-color)' }
                    : { bg: 'var(--badge-worker-bg)', fg: 'var(--badge-worker-text)', br: 'var(--badge-worker-border)' };

                  return (
                    <tr key={profile.id}
                      style={{
                        borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border-color)',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                      <Td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%',
                            background: 'var(--accent-primary-muted)', color: 'var(--accent-primary-text)',
                            border: '1px solid var(--accent-primary-border)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                          }}>
                            {(profile.name || '?').charAt(0)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{profile.name}</span>
                              {isSelf && (
                                <span style={{
                                  padding: '1px 6px', borderRadius: 999,
                                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                  color: 'var(--text-secondary)',
                                  fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                                }}>You</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '2px 9px', borderRadius: 999,
                          background: roleColors.bg, color: roleColors.fg, border: `1px solid ${roleColors.br}`,
                          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                        }}>
                          {role === 'ceo' ? 'CEO' : role}
                        </span>
                      </Td>
                      <Td>
                        <span style={{ color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                          {new Date(profile.created_at || profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </Td>
                      <Td align="right">
                        {isSelf ? (
                          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>
                        ) : (
                          <button onClick={() => setDeleteTarget(profile)} title={`Delete ${profile.name}`}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                              background: 'transparent', border: '1px solid var(--alert-error-border)',
                              color: 'var(--alert-error-text)', cursor: 'pointer',
                              fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                              transition: 'background 0.12s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--alert-error-bg)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                            <Trash2 size={12}/>Delete
                          </button>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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

// ── Helpers ──────────────────────────────────────────────────────────────

const Card = ({ children }) => (
  <div style={{
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
  }}>{children}</div>
);

const CardHeader = ({ eyebrow, title, subtitle, right }) => (
  <div style={{
    padding: '14px 18px', borderBottom: '1px solid var(--border-color)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
  }}>
    <div>
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
    {right}
  </div>
);

const Field = ({ label, hint, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)',
    }}>
      <span>{label}</span>
      {hint && <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{hint}</span>}
    </div>
    {children}
  </div>
);

const Alert = ({ tone, children }) => {
  const t = tone === 'danger'
    ? { bg: 'var(--alert-error-bg)', fg: 'var(--alert-error-text)', br: 'var(--alert-error-border)' }
    : { bg: 'var(--alert-success-bg)', fg: 'var(--alert-success-text)', br: 'var(--alert-success-border)' };
  return (
    <div style={{
      padding: '10px 12px', background: t.bg, color: t.fg, border: `1px solid ${t.br}`,
      borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
};

const SegmentedRole = ({ value, onChange }) => {
  const opts = [
    { id: 'worker', label: 'Worker' },
    { id: 'ceo',    label: 'Manager / CEO' },
  ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${opts.length}, 1fr)`, gap: 4,
      padding: 4, background: 'var(--bg-primary)',
      border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
    }}>
      {opts.map(o => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          style={{
            padding: '6px 8px', borderRadius: 'var(--radius-sm)',
            background: value === o.id ? 'var(--bg-secondary)' : 'transparent',
            color: value === o.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: value === o.id ? '1px solid var(--border-color)' : '1px solid transparent',
            boxShadow: value === o.id ? 'var(--shadow-sm)' : 'none',
            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
};

const SearchBox = ({ value, onChange }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '0 10px', height: 28,
    background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)',
  }}>
    <Search size={12}/>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search…"
      style={{
        width: 140, height: '100%', border: 'none', outline: 'none',
        background: 'transparent', color: 'var(--text-primary)',
        fontFamily: 'inherit', fontSize: 12, padding: 0,
      }}/>
  </div>
);

const Th = ({ children, align = 'left' }) => (
  <th style={{
    padding: '10px 14px', textAlign: align,
    fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--text-tertiary)',
    borderBottom: '1px solid var(--border-color)',
  }}>{children}</th>
);

const Td = ({ children, align = 'left' }) => (
  <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: align }}>{children}</td>
);

const EmptyState = ({ icon, title, body }) => (
  <div style={{ padding: '48px 24px', textAlign: 'center' }}>
    <div style={{ color: 'var(--text-tertiary)', marginBottom: 12, display: 'inline-flex' }}>{icon}</div>
    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{body}</div>
  </div>
);

export default Team;
