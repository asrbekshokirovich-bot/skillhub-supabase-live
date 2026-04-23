import React, { useState, useEffect } from 'react';
import { Loader2, UserPlus, ShieldAlert, Users, Trash2 } from 'lucide-react';
import { authService } from '../lib/services/authService';
import { userService } from '../lib/services/userService';
import DeleteUserModal from '../components/DeleteUserModal';

const Team = ({ currentUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('worker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [profiles, setProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
      <div className="flex-col items-center justify-center w-full h-full gap-4 text-center mt-12">
        <ShieldAlert size={48} className="text-secondary" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-secondary">Only Project Managers / CEOs can manage team accounts.</p>
      </div>
    );
  }

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await authService.createSecondaryUser(username, role, password);
      setSuccess(`Account for '${username}' created successfully!`);
      setUsername('');
      setPassword('');
      setRole('worker');
      fetchProfiles();
    } catch (err) {
      setError(err.message || 'Failed to create user account.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserDeleted = (deletedId) => {
    setProfiles((prev) => prev.filter((p) => p.id !== deletedId));
    setDeleteTarget(null);
  };

  return (
    <div className="flex-col gap-6 animate-fade-in w-full max-w-4xl">
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

          <div className="flex gap-4 w-full flex-wrap">
            <div className="flex-col gap-1.5 flex-1" style={{ minWidth: '200px' }}>
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
            <div className="flex-col gap-1.5 flex-1" style={{ minWidth: '200px' }}>
              <label className="text-sm font-bold">Account Role</label>
              <select
                className="input w-full"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ appearance: 'auto', outline: 'none' }}
              >
                <option value="worker">Worker</option>
                <option value="ceo">Project Manager / CEO</option>
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
              <table className="responsive-cards" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                        className="hover:bg-[var(--bg-secondary)] transition-colors border-b border-[var(--border-color)]"
                      >
                        <td data-label="Username" style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%',
                              backgroundColor: 'var(--bg-tertiary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                            }}>
                              {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            {profile.name}
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

                        <td data-label="Role" style={{ padding: '1rem', fontSize: '0.875rem' }}>
                          <span className="badge" style={{
                            textTransform: 'capitalize',
                            backgroundColor:
                              profile.role === 'ceo' ? '#fca5a5' :
                              profile.role === 'worker' ? '#bae6fd' :
                              'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                          }}>
                            {profile.role}
                          </span>
                        </td>

                        <td data-label="Joined Date" style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {new Date(profile.created_at || profile.createdAt).toLocaleDateString()}
                        </td>

                        <td data-label="Actions" style={{ padding: '1rem', textAlign: 'right' }}>
                          {isSelf ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>—</span>
                          ) : (
                            <button
                              title={`Delete ${profile.name}`}
                              onClick={() => setDeleteTarget(profile)}
                              className="btn-danger-hover inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.8rem] font-medium text-red-500 rounded-md border border-red-500/40 transition-all cursor-pointer bg-transparent"
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
