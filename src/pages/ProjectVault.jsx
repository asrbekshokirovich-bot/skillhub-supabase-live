import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Copy, Eye, EyeOff, Plus, Trash2, Edit2, Key, Server, Globe, Database, FileText, Loader2, Check } from 'lucide-react';
import ProjectFiles from '../components/ProjectFiles';

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
  const [activeTab, setActiveTab] = useState('hosting');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  
  // UI State
  const [revealed, setRevealed] = useState({});
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (activeTab !== 'files') fetchCredentials(activeTab);
  }, [projectId, activeTab]);

  const fetchCredentials = async (categoryId) => {
    setLoading(true);
    setRevealed({});
    setEntries([]);
    try {
      const { data, error } = await supabase.from('credentials').select('entries').eq('projectId', projectId).eq('category', categoryId).single();
      if (error && error.code !== 'PGRST116') throw error; // Handle PGRST116 (No Result) gracefully
      setEntries(data?.entries || []);
    } catch (err) {
      console.error("Error fetching credentials:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveCredentials = async (newEntries) => {
    try {
      // Check if row exists for category
      const { data } = await supabase.from('credentials').select('id').eq('projectId', projectId).eq('category', activeTab).single();
      
      if (data) {
        await supabase.from('credentials').update({ entries: newEntries }).eq('id', data.id);
      } else {
        await supabase.from('credentials').insert({ projectId, category: activeTab, entries: newEntries });
      }
      setEntries(newEntries);
    } catch (err) {
      console.error("Error saving credentials:", err);
      alert("Failed to save credentials");
    }
  };

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    if (!editForm.label || !editForm.value) return;

    let newEntries;
    if (editForm.id) {
      // Update
      newEntries = entries.map(ent => ent.id === editForm.id ? editForm : ent);
    } else {
      // Create
      newEntries = [...entries, { ...editForm, id: generateId() }];
    }
    
    await saveCredentials(newEntries);
    setIsEditing(false);
    setEditForm(null);
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm("Are you sure you want to delete this credential?")) return;
    const newEntries = entries.filter(e => e.id !== id);
    await saveCredentials(newEntries);
  };

  const toggleReveal = (id) => {
    setRevealed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.8)', padding: '1rem', backdropFilter: 'blur(4px)' }}>
      <div className="flex flex-col w-[95vw] md:w-full bottom-sheet" style={{ width: '95vw', maxWidth: '1000px', height: '85vh', backgroundColor: '#000000', border: '1px solid #333333', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #222222', backgroundColor: '#050505', flexShrink: 0 }}>
          <div>
            <h2 className="flex items-center gap-2" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
              <Key style={{ color: '#888888', marginBottom: '2px' }} size={20} />
              {projectName} <span style={{ color: '#666666', fontWeight: 400 }}>— Vault</span>
            </h2>
            <p style={{ fontSize: '13px', color: '#888888', margin: '4px 0 0 0' }}>Secure repository for project credentials and sensitive data.</p>
          </div>
          <button onClick={onClose} className="btn-icon-hover" style={{ padding: '0.5rem', borderRadius: '8px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="vault-layout flex flex-1" style={{ overflow: 'hidden' }}>
          {/* Sidebar */}
          <div className="vault-sidebar" style={{ backgroundColor: '#0A0A0A' }}>
            <div className="hidden md:block" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666666', marginBottom: '1rem', padding: '0 0.5rem' }}>Categories</div>
            <div className="vault-tabs-container flex flex-col gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveTab(cat.id); setIsEditing(false); }}
                  className={`flex items-center gap-2 flex-shrink-0 ${activeTab !== cat.id ? 'tab-btn-unselected' : ''}`}
                  style={{ 
                    padding: '0.625rem 0.75rem', borderRadius: '8px', fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap',
                    backgroundColor: activeTab === cat.id ? '#1A1A1A' : 'transparent',
                    color: activeTab === cat.id ? '#FFFFFF' : '#888888',
                    border: activeTab === cat.id ? '1px solid #333333' : '1px solid transparent'
                  }}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Panel */}
          <div className="flex-1 flex flex-col" style={{ backgroundColor: '#000000', overflow: 'hidden' }}>
            <div className="flex items-center justify-between" style={{ padding: '1.25rem 2rem', borderBottom: '1px solid #111111', flexShrink: 0 }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#FFFFFF', margin: 0 }}>
                {CATEGORIES.find(c => c.id === activeTab)?.label}
              </h3>
              {!isEditing && activeTab !== 'files' && (
                <button 
                  onClick={() => {
                    setEditForm({ id: '', label: '', value: '', username: '', notes: '' });
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-2 btn-white-hover"
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}
                >
                  <Plus size={16} /> Add Credential
                </button>
              )}
            </div>

            {activeTab === 'files' ? (
              <ProjectFiles projectId={projectId} />
            ) : (
              <div className="flex-1" style={{ padding: '2rem', overflowY: 'auto' }}>
                {loading ? (
                <div className="flex items-center justify-center h-full" style={{ color: '#666666' }}>
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : isEditing ? (
                /* Edit Form */
                <form onSubmit={handleSaveEntry} className="flex flex-col" style={{ maxWidth: '42rem', border: '1px solid #333333', borderRadius: '12px', padding: '1.5rem', backgroundColor: '#0A0A0A' }}>
                  <h4 style={{ color: '#FFFFFF', fontWeight: 500, marginBottom: '1.5rem', fontSize: '15px', marginTop: 0 }}>
                    {editForm.id ? 'Edit Credential' : 'New Credential'}
                  </h4>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#888888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Label (e.g., Production DB, Server IP)</label>
                      <input 
                        type="text" 
                        required 
                        value={editForm.label} 
                        onChange={e => setEditForm({...editForm, label: e.target.value})}
                        className="vault-input"
                        style={{ width: '100%', backgroundColor: '#000000', borderRadius: '8px', padding: '10px 16px', color: '#FFFFFF', fontSize: '14px', outline: 'none' }}
                        placeholder="My SQL Database"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#888888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username / Identifier (Optional)</label>
                      <input 
                        type="text" 
                        value={editForm.username} 
                        onChange={e => setEditForm({...editForm, username: e.target.value})}
                        className="vault-input"
                        style={{ width: '100%', backgroundColor: '#000000', borderRadius: '8px', padding: '10px 16px', color: '#FFFFFF', fontSize: '14px', outline: 'none' }}
                        placeholder="root"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#888888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Value / Password / Key</label>
                      <textarea 
                        required 
                        value={editForm.value} 
                        onChange={e => setEditForm({...editForm, value: e.target.value})}
                        className="vault-input"
                        style={{ width: '100%', backgroundColor: '#000000', borderRadius: '8px', padding: '10px 16px', color: '#FFFFFF', fontSize: '14px', outline: 'none', minHeight: '80px', fontFamily: 'monospace' }}
                        placeholder="Enter the secret value..."
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#888888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes / Extra Info (Optional)</label>
                      <textarea 
                        value={editForm.notes} 
                        onChange={e => setEditForm({...editForm, notes: e.target.value})}
                        className="vault-input"
                        style={{ width: '100%', backgroundColor: '#000000', borderRadius: '8px', padding: '10px 16px', color: '#FFFFFF', fontSize: '14px', outline: 'none', minHeight: '60px' }}
                        placeholder="e.g., Only accessible via VPN..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #222222' }}>
                    <button type="button" onClick={() => setIsEditing(false)} className="btn-icon-hover" style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', fontSize: '13px', fontWeight: 500 }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-white-hover" style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}>
                      Save Credential
                    </button>
                  </div>
                </form>
              ) : entries.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center h-full" style={{ textAlign: 'center', border: '2px dashed #222222', borderRadius: '1rem', padding: '3rem' }}>
                  <div className="flex items-center justify-center" style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#111111', border: '1px solid #333333', marginBottom: '1rem' }}>
                    <Key style={{ color: '#666666' }} size={28} />
                  </div>
                  <h3 style={{ color: '#FFFFFF', fontWeight: 500, fontSize: '16px', margin: '0 0 8px 0' }}>No credentials yet</h3>
                  <p style={{ color: '#888888', fontSize: '14px', maxWidth: '300px', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>Store sensitive information like database passwords, server IPs, and API keys securely in this vault.</p>
                  <button 
                    onClick={() => {
                      setEditForm({ id: '', label: '', value: '', username: '', notes: '' });
                      setIsEditing(true);
                    }}
                    className="flex items-center gap-2 btn-white-hover"
                    style={{ padding: '0.625rem 1.25rem', borderRadius: '8px', fontSize: '14px', fontWeight: 700 }}
                  >
                    <Plus size={18} /> Add First Credential
                  </button>
                </div>
              ) : (
                /* Entries List */
                <div className="flex flex-col gap-4 w-full">
                  {entries.map(entry => (
                    <div key={entry.id} className="flex flex-col vault-entry-card" style={{ backgroundColor: '#0A0A0A', border: '1px solid', borderRadius: '12px', overflow: 'hidden' }}>
                      {/* Entry Header */}
                      <div className="flex items-start justify-between" style={{ padding: '1.25rem', borderBottom: '1px solid #111111' }}>
                        <div className="flex flex-col gap-2">
                          <h4 style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '15px', margin: 0 }}>{entry.label}</h4>
                          {entry.username && (
                            <div style={{ fontSize: '13px', color: '#888888', fontFamily: 'monospace' }}>user: <span style={{ color: '#CCCCCC' }}>{entry.username}</span></div>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="vault-actions flex items-center gap-2">
                          <button onClick={() => { setEditForm(entry); setIsEditing(true); }} className="btn-icon-hover" style={{ padding: '6px', borderRadius: '4px' }} title="Edit">
                            <Edit2 size={14} />
                          </button>
                          <div style={{ width: '1px', height: '16px', backgroundColor: '#333333' }} />
                          <button onClick={() => handleDeleteEntry(entry.id)} className="btn-danger-hover" style={{ padding: '6px', borderRadius: '4px' }} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Entry Value */}
                      <div className="flex flex-col gap-4" style={{ padding: '1.25rem', backgroundColor: '#000000' }}>
                        <div>
                          <label style={{ fontSize: '10px', fontWeight: 700, color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>Value</label>
                          <div className="flex items-start gap-4">
                            <div className="flex-1 flex items-center" style={{ backgroundColor: '#050505', border: '1px solid #222222', borderRadius: '8px', padding: '12px', minHeight: '44px', overflowX: 'auto' }}>
                              {revealed[entry.id] ? (
                                <pre style={{ fontSize: '13px', color: '#E2E8F0', fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5 }}>{entry.value}</pre>
                              ) : (
                                <div style={{ fontSize: '18px', color: '#666666', letterSpacing: '4px', lineHeight: 1, marginTop: '4px' }}>••••••••••••••••••</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                              <button 
                                onClick={() => toggleReveal(entry.id)} 
                                className="flex items-center justify-center btn-icon-hover"
                                style={{ height: '44px', padding: '0 12px', border: '1px solid #333333', borderRadius: '8px' }}
                                title={revealed[entry.id] ? "Hide" : "Reveal"}
                              >
                                {revealed[entry.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                              <button 
                                onClick={() => copyToClipboard(entry.value, entry.id)} 
                                className="flex items-center justify-center gap-2 btn-white-hover"
                                style={{ height: '44px', padding: '0 16px', border: '1px solid #FFFFFF', borderRadius: '8px', fontSize: '13px', fontWeight: 700, minWidth: '100px' }}
                              >
                                {copied === entry.id ? (
                                  <><Check size={16} /> Copied</>
                                ) : (
                                  <><Copy size={16} /> Copy</>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        {entry.notes && (
                          <div style={{ paddingTop: '12px', borderTop: '1px solid #111111' }}>
                            <label style={{ fontSize: '10px', fontWeight: 700, color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }}>Notes</label>
                            <p style={{ fontSize: '13px', color: '#888888', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 }}>{entry.notes}</p>
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
