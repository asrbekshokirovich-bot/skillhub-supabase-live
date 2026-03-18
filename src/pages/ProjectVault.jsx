import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { X, Copy, Eye, EyeOff, Plus, Trash2, Edit2, Key, Server, Globe, Database, FileText, Loader2, Check } from 'lucide-react';

const CATEGORIES = [
  { id: 'hosting', label: 'Hosting & Server', icon: <Server size={16} /> },
  { id: 'domain', label: 'Domain & DNS', icon: <Globe size={16} /> },
  { id: 'database', label: 'Database', icon: <Database size={16} /> },
  { id: 'apikeys', label: 'API Keys', icon: <Key size={16} /> },
  { id: 'other', label: 'Other Credentials', icon: <FileText size={16} /> }
];

const generateId = () => Math.random().toString(36).substring(2, 9);

const ProjectVault = ({ projectId, projectName, onClose }) => {
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
    fetchCredentials(activeTab);
  }, [projectId, activeTab]);

  const fetchCredentials = async (categoryId) => {
    setLoading(true);
    setRevealed({});
    setEntries([]);
    try {
      const docRef = doc(db, 'projects', projectId, 'credentials', categoryId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setEntries(snap.data().entries || []);
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error("Error fetching credentials:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveCredentials = async (newEntries) => {
    try {
      const docRef = doc(db, 'projects', projectId, 'credentials', activeTab);
      // use setDoc with merge to create if not exists
      await setDoc(docRef, { entries: newEntries }, { merge: true });
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
      <div className="flex flex-col" style={{ width: '100%', maxWidth: '1000px', height: '85vh', backgroundColor: '#000000', border: '1px solid #333333', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #222222', backgroundColor: '#050505', flexShrink: 0 }}>
          <div>
            <h2 className="flex items-center gap-2" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
              <Key style={{ color: '#888888', marginBottom: '2px' }} size={20} />
              {projectName} <span style={{ color: '#666666', fontWeight: 400 }}>— Vault</span>
            </h2>
            <p style={{ fontSize: '13px', color: '#888888', margin: '4px 0 0 0' }}>Secure repository for project credentials and sensitive data.</p>
          </div>
          <button onClick={onClose} style={{ padding: '0.5rem', borderRadius: '8px', color: '#888888', transition: 'all 0.2s', background: 'transparent' }} onMouseOver={e => {e.currentTarget.style.color='#FFFFFF'; e.currentTarget.style.backgroundColor='#222222'}} onMouseOut={e => {e.currentTarget.style.color='#888888'; e.currentTarget.style.backgroundColor='transparent'}}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1" style={{ overflow: 'hidden' }}>
          {/* Sidebar */}
          <div className="flex flex-col" style={{ width: '250px', borderRight: '1px solid #222222', backgroundColor: '#0A0A0A', padding: '1rem', flexShrink: 0, overflowY: 'auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666666', marginBottom: '1rem', padding: '0 0.5rem' }}>Categories</div>
            <div className="flex flex-col gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveTab(cat.id); setIsEditing(false); }}
                  className="flex items-center gap-2"
                  style={{ 
                    padding: '0.625rem 0.75rem', borderRadius: '8px', fontSize: '14px', fontWeight: 500, transition: 'all 0.2s',
                    backgroundColor: activeTab === cat.id ? '#1A1A1A' : 'transparent',
                    color: activeTab === cat.id ? '#FFFFFF' : '#888888',
                    border: activeTab === cat.id ? '1px solid #333333' : '1px solid transparent'
                  }}
                  onMouseOver={e => { if(activeTab !== cat.id) { e.currentTarget.style.color='#CCCCCC'; e.currentTarget.style.backgroundColor='#111111'; }}}
                  onMouseOut={e => { if(activeTab !== cat.id) { e.currentTarget.style.color='#888888'; e.currentTarget.style.backgroundColor='transparent'; }}}
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
              {!isEditing && (
                <button 
                  onClick={() => {
                    setEditForm({ id: '', label: '', value: '', username: '', notes: '' });
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-2"
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#FFFFFF', color: '#000000', borderRadius: '8px', fontSize: '13px', fontWeight: 700, transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor='#E5E5E5'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor='#FFFFFF'}
                >
                  <Plus size={16} /> Add Credential
                </button>
              )}
            </div>

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
                        style={{ width: '100%', backgroundColor: '#000000', border: '1px solid #333333', borderRadius: '8px', padding: '10px 16px', color: '#FFFFFF', fontSize: '14px', outline: 'none' }}
                        onFocus={e => e.currentTarget.style.borderColor='#FFFFFF'}
                        onBlur={e => e.currentTarget.style.borderColor='#333333'}
                        placeholder="My SQL Database"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#888888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username / Identifier (Optional)</label>
                      <input 
                        type="text" 
                        value={editForm.username} 
                        onChange={e => setEditForm({...editForm, username: e.target.value})}
                        style={{ width: '100%', backgroundColor: '#000000', border: '1px solid #333333', borderRadius: '8px', padding: '10px 16px', color: '#FFFFFF', fontSize: '14px', outline: 'none' }}
                        onFocus={e => e.currentTarget.style.borderColor='#FFFFFF'}
                        onBlur={e => e.currentTarget.style.borderColor='#333333'}
                        placeholder="root"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#888888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Value / Password / Key</label>
                      <textarea 
                        required 
                        value={editForm.value} 
                        onChange={e => setEditForm({...editForm, value: e.target.value})}
                        style={{ width: '100%', backgroundColor: '#000000', border: '1px solid #333333', borderRadius: '8px', padding: '10px 16px', color: '#FFFFFF', fontSize: '14px', outline: 'none', minHeight: '80px', fontFamily: 'monospace' }}
                        onFocus={e => e.currentTarget.style.borderColor='#FFFFFF'}
                        onBlur={e => e.currentTarget.style.borderColor='#333333'}
                        placeholder="Enter the secret value..."
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#888888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes / Extra Info (Optional)</label>
                      <textarea 
                        value={editForm.notes} 
                        onChange={e => setEditForm({...editForm, notes: e.target.value})}
                        style={{ width: '100%', backgroundColor: '#000000', border: '1px solid #333333', borderRadius: '8px', padding: '10px 16px', color: '#FFFFFF', fontSize: '14px', outline: 'none', minHeight: '60px' }}
                        onFocus={e => e.currentTarget.style.borderColor='#FFFFFF'}
                        onBlur={e => e.currentTarget.style.borderColor='#333333'}
                        placeholder="e.g., Only accessible via VPN..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #222222' }}>
                    <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: '#888888', background: 'transparent' }} onMouseOver={e=>e.currentTarget.style.color='#FFFFFF'} onMouseOut={e=>e.currentTarget.style.color='#888888'}>
                      Cancel
                    </button>
                    <button type="submit" style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', fontSize: '13px', fontWeight: 700, backgroundColor: '#FFFFFF', color: '#000000' }} onMouseOver={e=>e.currentTarget.style.backgroundColor='#E5E5E5'} onMouseOut={e=>e.currentTarget.style.backgroundColor='#FFFFFF'}>
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
                    className="flex items-center gap-2"
                    style={{ padding: '0.625rem 1.25rem', backgroundColor: '#FFFFFF', color: '#000000', borderRadius: '8px', fontSize: '14px', fontWeight: 700 }}
                    onMouseOver={e=>e.currentTarget.style.backgroundColor='#E5E5E5'} onMouseOut={e=>e.currentTarget.style.backgroundColor='#FFFFFF'}
                  >
                    <Plus size={18} /> Add First Credential
                  </button>
                </div>
              ) : (
                /* Entries List */
                <div className="flex flex-col gap-4 w-full">
                  {entries.map(entry => (
                    <div key={entry.id} className="flex flex-col" style={{ backgroundColor: '#0A0A0A', border: '1px solid #222222', borderRadius: '12px', overflow: 'hidden' }} onMouseOver={e=>{e.currentTarget.style.borderColor='#444444'; const actions = e.currentTarget.querySelector(`.vault-actions-${entry.id}`); if(actions) actions.style.opacity=1;}} onMouseOut={e=>{e.currentTarget.style.borderColor='#222222'; const actions = e.currentTarget.querySelector(`.vault-actions-${entry.id}`); if(actions) actions.style.opacity=0;}}>
                      {/* Entry Header */}
                      <div className="flex items-start justify-between" style={{ padding: '1.25rem', borderBottom: '1px solid #111111' }}>
                        <div className="flex flex-col gap-2">
                          <h4 style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '15px', margin: 0 }}>{entry.label}</h4>
                          {entry.username && (
                            <div style={{ fontSize: '13px', color: '#888888', fontFamily: 'monospace' }}>user: <span style={{ color: '#CCCCCC' }}>{entry.username}</span></div>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className={`vault-actions-${entry.id} flex items-center gap-2`} style={{ opacity: 0, transition: 'opacity 0.2s', backgroundColor: '#111111', padding: '4px', borderRadius: '8px', border: '1px solid #222222' }}>
                          <button onClick={() => { setEditForm(entry); setIsEditing(true); }} style={{ padding: '6px', color: '#888888', borderRadius: '4px', background: 'transparent' }} onMouseOver={e=>{e.currentTarget.style.color='#FFFFFF'; e.currentTarget.style.backgroundColor='#222222';}} onMouseOut={e=>{e.currentTarget.style.color='#888888'; e.currentTarget.style.backgroundColor='transparent';}} title="Edit">
                            <Edit2 size={14} />
                          </button>
                          <div style={{ width: '1px', height: '16px', backgroundColor: '#333333' }} />
                          <button onClick={() => handleDeleteEntry(entry.id)} style={{ padding: '6px', color: '#888888', borderRadius: '4px', background: 'transparent' }} onMouseOver={e=>{e.currentTarget.style.color='#f87171'; e.currentTarget.style.backgroundColor='#222222';}} onMouseOut={e=>{e.currentTarget.style.color='#888888'; e.currentTarget.style.backgroundColor='transparent';}} title="Delete">
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
                                className="flex items-center justify-center"
                                style={{ height: '44px', padding: '0 12px', backgroundColor: '#111111', border: '1px solid #333333', borderRadius: '8px', color: '#888888', transition: 'all 0.2s' }}
                                onMouseOver={e=>{e.currentTarget.style.color='#FFFFFF'; e.currentTarget.style.backgroundColor='#222222';}}
                                onMouseOut={e=>{e.currentTarget.style.color='#888888'; e.currentTarget.style.backgroundColor='#111111';}}
                                title={revealed[entry.id] ? "Hide" : "Reveal"}
                              >
                                {revealed[entry.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                              <button 
                                onClick={() => copyToClipboard(entry.value, entry.id)} 
                                className="flex items-center justify-center gap-2"
                                style={{ height: '44px', padding: '0 16px', backgroundColor: '#FFFFFF', color: '#000000', border: '1px solid #FFFFFF', borderRadius: '8px', fontSize: '13px', fontWeight: 700, minWidth: '100px', transition: 'all 0.2s' }}
                                onMouseOver={e=>e.currentTarget.style.backgroundColor='#E5E5E5'}
                                onMouseOut={e=>e.currentTarget.style.backgroundColor='#FFFFFF'}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectVault;
