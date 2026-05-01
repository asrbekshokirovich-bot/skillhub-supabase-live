import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { X, Copy, Eye, EyeOff, Plus, Trash2, Edit2, Key, Server, Globe, Database, FileText, Loader2, Check } from 'lucide-react';
import ProjectFiles from '../components/ProjectFiles';
import { useSystem } from '../components/SystemUI';

// SYSTEM RULE: No hardcoded colors. All values reference CSS design tokens.
const CATEGORIES = [
  { id: 'hosting', label: 'Hosting & Server', icon: <Server size={16} /> },
  { id: 'domain', label: 'Domain & DNS', icon: <Globe size={16} /> },
  { id: 'database', label: 'Database', icon: <Database size={16} /> },
  { id: 'apikeys', label: 'API Keys', icon: <Key size={16} /> },
  { id: 'other', label: 'Other Credentials', icon: <FileText size={16} /> },
  { id: 'files', label: 'Files & Assets', icon: <FileText size={16} /> }
];

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function ProjectVault({ projectId, projectName, onClose }) {
  const { toast, showConfirm } = useSystem();
  const [activeTab, setActiveTab] = useState('hosting');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [copied, setCopied] = useState(null);

  const fetchCredentials = useCallback(async (categoryId) => {
    setLoading(true);
    setRevealed({});
    setEntries([]);
    try {
      const { data, error } = await supabase
        .from('credentials')
        .select('entries')
        .eq('projectId', projectId)
        .eq('category', categoryId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      setEntries(data?.entries || []);
    } catch (err) {
      console.error('Error fetching credentials:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (activeTab !== 'files') fetchCredentials(activeTab);
  }, [activeTab, fetchCredentials]);

  const saveCredentials = async (newEntries) => {
    try {
      const { data } = await supabase
        .from('credentials')
        .select('id')
        .eq('projectId', projectId)
        .eq('category', activeTab)
        .single();
      if (data) {
        await supabase.from('credentials').update({ entries: newEntries }).eq('id', data.id);
      } else {
        await supabase.from('credentials').insert({ projectId, category: activeTab, entries: newEntries });
      }
      setEntries(newEntries);
    } catch (err) {
      console.error('Error saving credentials:', err);
      toast.error('Failed to save credentials');
    }
  };

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    if (!editForm.label || !editForm.value) return;
    const newEntries = editForm.id
      ? entries.map(ent => ent.id === editForm.id ? editForm : ent)
      : [...entries, { ...editForm, id: generateId() }];
    await saveCredentials(newEntries);
    setIsEditing(false);
    setEditForm(null);
    toast.success(editForm.id ? 'Credential updated' : 'Credential saved');
  };

  const handleDeleteEntry = async (id) => {
    // SYSTEM RULE: No window.confirm. All confirmations use in-product ConfirmDialog.
    const confirmed = await showConfirm('This credential will be permanently deleted.', 'Delete Credential?');
    if (!confirmed) return;
    const newEntries = entries.filter(e => e.id !== id);
    await saveCredentials(newEntries);
    toast.success('Credential deleted');
  };

  const toggleReveal = (id) => setRevealed(prev => ({ ...prev, [id]: !prev[id] }));

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', padding: '1rem', backdropFilter: 'blur(4px)' }}
    >
      {/* SYSTEM RULE: All colors are CSS variables — theme-aware by default. */}
      <div
        className="flex flex-col bottom-sheet"
        style={{
          width: '95vw', maxWidth: '1000px', height: '85vh',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              className="flex items-center gap-2"
              style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}
            >
              <Key style={{ color: 'var(--text-tertiary)' }} size={18} />
              {projectName}
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>— Vault</span>
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Secure repository for project credentials and sensitive data.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.4rem', lineHeight: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Layout */}
        <div className="vault-layout flex flex-1" style={{ overflow: 'hidden' }}>
          {/* Category Sidebar */}
          <div
            className="vault-sidebar"
            style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}
          >
            <div
              className="hidden md:block"
              style={{
                fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'var(--text-tertiary)',
                marginBottom: '1rem', padding: '0 0.5rem',
              }}
            >
              Categories
            </div>
            <div className="vault-tabs-container flex flex-col gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveTab(cat.id); setIsEditing(false); }}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: activeTab === cat.id ? 'var(--bg-tertiary)' : 'transparent',
                    color: activeTab === cat.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: `1px solid ${activeTab === cat.id ? 'var(--border-color)' : 'transparent'}`,
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Panel */}
          <div className="flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
            <div
              className="flex items-center justify-between"
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border-color)',
                flexShrink: 0,
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {CATEGORIES.find(c => c.id === activeTab)?.label}
              </h3>
              {!isEditing && activeTab !== 'files' && (
                <button
                  onClick={() => {
                    setEditForm({ id: '', label: '', value: '', username: '', notes: '' });
                    setIsEditing(true);
                  }}
                  className="btn btn-primary flex items-center gap-2"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}
                >
                  <Plus size={14} /> Add Credential
                </button>
              )}
            </div>

            {activeTab === 'files' ? (
              <ProjectFiles projectId={projectId} />
            ) : (
              <div className="flex-1 custom-scrollbar" style={{ padding: '1.5rem', overflowY: 'auto' }}>
                {loading ? (
                  <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-tertiary)' }}>
                    <Loader2 className="animate-spin" size={28} />
                  </div>
                ) : isEditing ? (
                  /* Edit Form */
                  <form
                    onSubmit={handleSaveEntry}
                    className="flex flex-col"
                    style={{
                      maxWidth: '40rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1.5rem',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '1.5rem', fontSize: '0.9rem', marginTop: 0 }}>
                      {editForm.id ? 'Edit Credential' : 'New Credential'}
                    </h4>
                    <div className="flex flex-col gap-4">
                      {[
                        { key: 'label', label: 'Label (e.g., Production DB, Server IP)', required: true, placeholder: 'My SQL Database', type: 'input' },
                        { key: 'username', label: 'Username / Identifier (Optional)', required: false, placeholder: 'root', type: 'input' },
                        { key: 'value', label: 'Value / Password / Key', required: true, placeholder: 'Enter the secret value...', type: 'textarea', mono: true },
                        { key: 'notes', label: 'Notes / Extra Info (Optional)', required: false, placeholder: 'e.g., Only accessible via VPN...', type: 'textarea' },
                      ].map(field => (
                        <div key={field.key}>
                          <label style={{
                            display: 'block', fontSize: '0.7rem', fontWeight: 700,
                            color: 'var(--text-secondary)', marginBottom: '6px',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                          }}>
                            {field.label}
                          </label>
                          {field.type === 'input' ? (
                            <input
                              type="text"
                              required={field.required}
                              value={editForm[field.key]}
                              onChange={e => setEditForm({ ...editForm, [field.key]: e.target.value })}
                              placeholder={field.placeholder}
                              style={{ width: '100%', fontFamily: field.mono ? 'monospace' : 'inherit' }}
                            />
                          ) : (
                            <textarea
                              required={field.required}
                              value={editForm[field.key]}
                              onChange={e => setEditForm({ ...editForm, [field.key]: e.target.value })}
                              placeholder={field.placeholder}
                              style={{ width: '100%', minHeight: field.key === 'value' ? '80px' : '60px', fontFamily: field.mono ? 'monospace' : 'inherit' }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div
                      className="flex justify-end gap-2"
                      style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}
                    >
                      <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Save Credential
                      </button>
                    </div>
                  </form>
                ) : entries.length === 0 ? (
                  /* Empty State */
                  <div
                    className="flex flex-col items-center justify-center h-full"
                    style={{
                      textAlign: 'center',
                      border: '2px dashed var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '3rem',
                    }}
                  >
                    <div
                      style={{
                        width: 56, height: 56, borderRadius: '50%',
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '1rem',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      <Key size={24} />
                    </div>
                    <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem', margin: '0 0 0.5rem 0' }}>
                      No credentials yet
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '300px', margin: '0 0 1.5rem 0', lineHeight: 1.6 }}>
                      Store sensitive information like database passwords, server IPs, and API keys securely.
                    </p>
                    <button
                      onClick={() => {
                        setEditForm({ id: '', label: '', value: '', username: '', notes: '' });
                        setIsEditing(true);
                      }}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Plus size={16} /> Add First Credential
                    </button>
                  </div>
                ) : (
                  /* Entries List */
                  <div className="flex flex-col gap-4 w-full">
                    {entries.map(entry => (
                      <div
                        key={entry.id}
                        className="flex flex-col"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-lg)',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Entry Header */}
                        <div
                          className="flex items-start justify-between"
                          style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}
                        >
                          <div className="flex flex-col gap-1">
                            <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                              {entry.label}
                            </h4>
                            {entry.username && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                user: <span style={{ color: 'var(--text-primary)' }}>{entry.username}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditForm(entry); setIsEditing(true); }}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', lineHeight: 0 }}
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="btn"
                              style={{ padding: '0.3rem 0.6rem', lineHeight: 0, backgroundColor: 'var(--alert-error-bg)', color: 'var(--alert-error-text)', border: '1px solid var(--alert-error-border)' }}
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Entry Value */}
                        <div className="flex flex-col gap-3" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-primary)' }}>
                          <div>
                            <label style={{
                              fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)',
                              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block',
                            }}>
                              Value
                            </label>
                            <div className="flex items-start gap-3">
                              <div
                                className="flex-1 flex items-center"
                                style={{
                                  backgroundColor: 'var(--bg-secondary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: '10px 12px',
                                  minHeight: '42px',
                                  overflow: 'hidden',
                                }}
                              >
                                {revealed[entry.id] ? (
                                  <pre style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5 }}>
                                    {entry.value}
                                  </pre>
                                ) : (
                                  <div style={{ fontSize: '1rem', color: 'var(--text-tertiary)', letterSpacing: '4px', lineHeight: 1 }}>
                                    ••••••••••••••••••
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                                <button
                                  onClick={() => toggleReveal(entry.id)}
                                  className="btn btn-secondary flex items-center justify-center"
                                  style={{ height: '42px', padding: '0 10px', lineHeight: 0 }}
                                  title={revealed[entry.id] ? 'Hide' : 'Reveal'}
                                >
                                  {revealed[entry.id] ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(entry.value, entry.id)}
                                  className="btn btn-primary flex items-center justify-center gap-2"
                                  style={{ height: '42px', padding: '0 1rem', fontSize: '0.8rem', minWidth: '90px' }}
                                >
                                  {copied === entry.id ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                                </button>
                              </div>
                            </div>
                          </div>
                          {entry.notes && (
                            <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }}>
                                Notes
                              </label>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 }}>
                                {entry.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
