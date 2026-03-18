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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl h-[85vh] bg-black border border-[#333333] rounded-xl flex flex-col shadow-2xl overflow-hidden animate-fade-in relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222222] bg-[#050505] shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Key className="text-[#888888] mb-0.5" size={20} />
              {projectName} <span className="text-[#666666] font-normal">— Vault</span>
            </h2>
            <p className="text-[13px] text-[#888888] mt-1">Secure repository for project credentials and sensitive data.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#222222] rounded-lg transition-colors text-[#888888] hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-[#222222] bg-[#0A0A0A] flex flex-col p-4 shrink-0 overflow-y-auto">
            <div className="text-[11px] font-[700] uppercase tracking-widest text-[#666666] mb-4 px-2">Categories</div>
            <div className="flex flex-col gap-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveTab(cat.id); setIsEditing(false); }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
                    activeTab === cat.id 
                      ? 'bg-[#1A1A1A] text-white border border-[#333333]' 
                      : 'text-[#888888] hover:text-[#CCCCCC] hover:bg-[#111111] border border-transparent'
                  }`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Panel */}
          <div className="flex-1 flex flex-col bg-black overflow-hidden">
            <div className="flex items-center justify-between px-8 py-5 border-b border-[#111111] shrink-0">
              <h3 className="text-lg font-semibold text-white">
                {CATEGORIES.find(c => c.id === activeTab)?.label}
              </h3>
              {!isEditing && (
                <button 
                  onClick={() => {
                    setEditForm({ id: '', label: '', value: '', username: '', notes: '' });
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-[13px] font-bold hover:bg-gray-200 transition-colors"
                >
                  <Plus size={16} /> Add Credential
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-8" style={{ scrollbarColor: '#333 transparent' }}>
              {loading ? (
                <div className="flex justify-center items-center h-full text-[#666666]">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : isEditing ? (
                /* Edit Form */
                <form onSubmit={handleSaveEntry} className="max-w-2xl border border-[#333333] rounded-xl p-6 bg-[#0A0A0A]">
                  <h4 className="text-white font-medium mb-6 text-[15px]">
                    {editForm.id ? 'Edit Credential' : 'New Credential'}
                  </h4>
                  <div className="flex flex-col gap-5">
                    <div>
                      <label className="block text-[12px] font-bold text-[#888888] mb-1.5 uppercase tracking-wider">Label (e.g., Production DB, Server IP)</label>
                      <input 
                        type="text" 
                        required 
                        value={editForm.label} 
                        onChange={e => setEditForm({...editForm, label: e.target.value})}
                        className="w-full bg-black border border-[#333333] rounded-lg px-4 py-2.5 text-white text-[14px] outline-none focus:border-white transition-colors"
                        placeholder="My SQL Database"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-[#888888] mb-1.5 uppercase tracking-wider">Username / Identifier (Optional)</label>
                      <input 
                        type="text" 
                        value={editForm.username} 
                        onChange={e => setEditForm({...editForm, username: e.target.value})}
                        className="w-full bg-black border border-[#333333] rounded-lg px-4 py-2.5 text-white text-[14px] outline-none focus:border-white transition-colors"
                        placeholder="root"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-[#888888] mb-1.5 uppercase tracking-wider">Value / Password / Key</label>
                      <textarea 
                        required 
                        value={editForm.value} 
                        onChange={e => setEditForm({...editForm, value: e.target.value})}
                        className="w-full bg-black border border-[#333333] rounded-lg px-4 py-2.5 text-white text-[14px] outline-none focus:border-white transition-colors min-h-[80px]"
                        placeholder="Enter the secret value..."
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-[#888888] mb-1.5 uppercase tracking-wider">Notes / Extra Info (Optional)</label>
                      <textarea 
                        value={editForm.notes} 
                        onChange={e => setEditForm({...editForm, notes: e.target.value})}
                        className="w-full bg-black border border-[#333333] rounded-lg px-4 py-2.5 text-white text-[14px] outline-none focus:border-white transition-colors min-h-[60px]"
                        placeholder="e.g., Only accessible via VPN..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-[#222222]">
                    <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2 rounded-lg text-[13px] font-medium text-[#888888] hover:text-white transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="px-6 py-2 rounded-lg text-[13px] font-bold bg-white text-black hover:bg-gray-200 transition-colors">
                      Save Credential
                    </button>
                  </div>
                </form>
              ) : entries.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center h-full text-center border-2 border-dashed border-[#222222] rounded-2xl p-12">
                  <div className="w-16 h-16 rounded-full bg-[#111111] border border-[#333333] flex items-center justify-center mb-4">
                    <Key className="text-[#666666]" size={28} />
                  </div>
                  <h3 className="text-white font-medium text-[16px] mb-2">No credentials yet</h3>
                  <p className="text-[#888888] text-[14px] max-w-sm mb-6">Store sensitive information like database passwords, server IPs, and API keys securely in this vault.</p>
                  <button 
                    onClick={() => {
                      setEditForm({ id: '', label: '', value: '', username: '', notes: '' });
                      setIsEditing(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-lg text-[14px] font-bold hover:bg-gray-200 transition-colors"
                  >
                    <Plus size={18} /> Add First Credential
                  </button>
                </div>
              ) : (
                /* Entries List */
                <div className="grid gap-4 w-full">
                  {entries.map(entry => (
                    <div key={entry.id} className="group flex flex-col bg-[#0A0A0A] border border-[#222222] rounded-xl hover:border-[#444444] transition-colors overflow-hidden relative">
                      {/* Entry Header */}
                      <div className="flex items-start justify-between p-5 border-b border-[#111111]">
                        <div className="flex flex-col gap-1">
                          <h4 className="text-white font-semibold text-[15px]">{entry.label}</h4>
                          {entry.username && (
                            <div className="text-[13px] text-[#888888] font-mono mt-0.5">user: <span className="text-[#CCCCCC]">{entry.username}</span></div>
                          )}
                        </div>
                        
                        {/* Actions (visible on hover) */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-[#111111] p-1.5 rounded-lg border border-[#222222]">
                          <button onClick={() => { setEditForm(entry); setIsEditing(true); }} className="p-1.5 text-[#888888] hover:text-white rounded transition-colors" title="Edit">
                            <Edit2 size={14} />
                          </button>
                          <div className="w-[1px] h-4 bg-[#333333]" />
                          <button onClick={() => handleDeleteEntry(entry.id)} className="p-1.5 text-[#888888] hover:text-red-400 rounded transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Entry Value */}
                      <div className="p-5 bg-black flex flex-col gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-[#666666] uppercase tracking-wider mb-2 block">Value</label>
                          <div className="flex items-start gap-4">
                            <div className="flex-1 bg-[#050505] border border-[#222222] rounded-lg p-3 overflow-x-auto min-h-[44px] flex items-center">
                              {revealed[entry.id] ? (
                                <pre className="text-[13px] text-[#E2E8F0] font-mono whitespace-pre-wrap leading-relaxed m-0">{entry.value}</pre>
                              ) : (
                                <div className="text-[18px] text-[#666666] tracking-[4px] leading-none mt-1">••••••••••••••••••</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button 
                                onClick={() => toggleReveal(entry.id)} 
                                className="h-[44px] px-3 flex items-center justify-center bg-[#111111] hover:bg-[#222222] border border-[#333333] rounded-lg transition-colors text-[#888888] hover:text-white"
                                title={revealed[entry.id] ? "Hide" : "Reveal"}
                              >
                                {revealed[entry.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                              <button 
                                onClick={() => copyToClipboard(entry.value, entry.id)} 
                                className="h-[44px] px-4 flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 border border-white rounded-lg transition-colors text-[13px] font-bold min-w-[100px]"
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
                          <div className="pt-3 border-t border-[#111111]">
                            <label className="text-[10px] font-bold text-[#666666] uppercase tracking-wider mb-1 block">Notes</label>
                            <p className="text-[13px] text-[#888888] leading-relaxed whitespace-pre-wrap">{entry.notes}</p>
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
