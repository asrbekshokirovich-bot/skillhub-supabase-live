import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { taskService } from '../lib/services/taskService';

const formatChatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
  
  const timeFormat = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (isToday) return timeFormat;
  if (isYesterday) return `Yesterday, ${timeFormat}`;
  
  const dateFormat = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${dateFormat}, ${timeFormat}`;
};

const MetadataRow = ({ label, children }) => (
  <>
    <div style={{ fontSize: '13px', fontWeight: 500, color: '#888' }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {children}
    </div>
  </>
);

const GhostDropdown = ({ value, onChange, options, prefix }) => (
  <div 
    style={{ display: 'flex', width: 'fit-content', alignItems: 'center', position: 'relative', marginLeft: '-8px', borderRadius: '4px', transition: 'background-color 0.2s' }}
    onMouseOver={e => e.currentTarget.style.backgroundColor = '#1A1A1A'}
    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
  >
    {prefix && <div style={{ marginLeft: '8px' }}>{prefix}</div>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ backgroundColor: 'transparent', color: '#E5E7EB', fontSize: '14px', fontWeight: 500, border: 'none', outline: 'none', cursor: 'pointer', padding: prefix ? '4px 24px 4px 4px' : '4px 24px 4px 8px', appearance: 'none', WebkitAppearance: 'none', zIndex: 1 }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value} style={{ backgroundColor: '#111', color: 'white' }}>{opt.label}</option>
      ))}
    </select>
    <svg style={{ position: 'absolute', right: '8px', color: '#888', pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
  </div>
);

const TaskDetailModal = ({ 
  issue, 
  projectId, 
  users, 
  currentUser, 
  projectDetails,
  onClose, 
  onIssueUpdated 
}) => {
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [activeTab, setActiveTab] = useState('Activity');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  const selectedIssue = issue;

  const updateTaskField = async (field, value) => {
    try {
      if (issue[field] === value) return;
      await taskService.updateTask(projectId, issue.id, { [field]: value });
      onIssueUpdated({ ...issue, [field]: value });
    } catch (err) {
      console.error(err);
      alert("Failed to update task: " + err.message);
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setIsCommenting(true);
    try {
      const newComment = {
        id: Date.now().toString(),
        text: newCommentText.trim(),
        author: currentUser?.name || 'Unknown',
        createdAt: new Date().toISOString()
      };
      const updatedComments = [...(issue.comments || []), newComment];
      await taskService.updateTask(projectId, issue.id, { comments: updatedComments });
      onIssueUpdated({ ...issue, comments: updatedComments });
      setNewCommentText('');
    } catch (err) {
      console.error(err);
      alert("Failed to update task: " + err.message);
    } finally {
      setIsCommenting(false);
    }
  };

  const addSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;
    try {
      const newSubtask = { id: Date.now().toString(), text: newSubtaskText.trim(), completed: false };
      const updatedSubtasks = [...(issue.subtasks || []), newSubtask];
      await taskService.updateTask(projectId, issue.id, { subtasks: updatedSubtasks });
      onIssueUpdated({ ...issue, subtasks: updatedSubtasks });
      setNewSubtaskText('');
    } catch (err) {
      console.error(err);
      alert("Failed to update task: " + err.message);
    }
  };

  const toggleSubtask = async (subtaskId) => {
    try {
      const updatedSubtasks = (issue.subtasks || []).map(st => 
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      );
      await taskService.updateTask(projectId, issue.id, { subtasks: updatedSubtasks });
      onIssueUpdated({ ...issue, subtasks: updatedSubtasks });
    } catch (err) {
      console.error(err);
      alert("Failed to update task: " + err.message);
    }
  };

  const deleteSubtask = async (subtaskId) => {
    try {
      const updatedSubtasks = (issue.subtasks || []).filter(st => st.id !== subtaskId);
      await taskService.updateTask(projectId, issue.id, { subtasks: updatedSubtasks });
      onIssueUpdated({ ...issue, subtasks: updatedSubtasks });
    } catch (err) {
      console.error(err);
      alert("Failed to update task: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] animate-fade-in flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="task-modal-layout relative flex shadow-2xl w-[95vw] max-w-[1100px] h-[90vh]" style={{ backgroundColor: '#0A0A0A', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

        {/* ─── LEFT: main content ─────────────────────────────── */}
        <div className="flex flex-col h-full overflow-y-auto flex-1 custom-scrollbar" style={{ padding: '32px', gap: '24px' }}>

          {/* Cover Image */}
          <div className="w-full relative group rounded-xl overflow-hidden flex items-center justify-end shrink-0 transition-all" style={{ height: selectedIssue?.coverUrl ? '160px' : '32px' }}>
            {selectedIssue?.coverUrl ? (
              <img src={selectedIssue.coverUrl} className="w-full h-full object-cover absolute inset-0" alt="Cover" />
            ) : (
              <button className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium text-[#888] hover:text-white hover:bg-[#1A1A1A]">
                + Add Cover Image
              </button>
            )}
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center text-[13px] font-medium shrink-0 text-[#888]">
            <span className="hover:text-white cursor-pointer transition-colors">{projectDetails?.name || 'Project'}</span>
            <span className="mx-2 text-[#444]">/</span>
            <span className="text-[#CCC] truncate max-w-[300px]">{selectedIssue.title}</span>
          </div>

          {/* Title Header */}
          <div className="flex items-start justify-between w-full shrink-0 gap-4 mb-2">
            {editingField === 'title' ? (
              <input
                autoFocus
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => { if (editValue.trim() !== selectedIssue.title) updateTaskField('title', editValue.trim()); setEditingField(null); }}
                onKeyDown={e => { if (e.key === 'Enter') { if (editValue.trim() !== selectedIssue.title) updateTaskField('title', editValue.trim()); setEditingField(null); } }}
                className="font-bold outline-none flex-1 bg-transparent text-white w-full border-b-2 border-indigo-500 pb-1"
                style={{ fontSize: '32px', lineHeight: '1.2' }}
              />
            ) : (
              <h1
                className="font-bold text-white hover:bg-[#1A1A1A] px-2 -ml-2 rounded cursor-pointer transition-colors flex-1"
                style={{ fontSize: '32px', lineHeight: '1.2' }}
                onClick={() => { setEditingField('title'); setEditValue(selectedIssue.title || ''); }}
              >
                {selectedIssue.title}
              </h1>
            )}
            <button className="shrink-0 p-2 hover:bg-[#222] rounded-md transition-colors text-[#888] hover:text-white" onClick={onClose} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: '16px', columnGap: '8px', paddingBottom: '24px', borderBottom: '1px solid #222', alignItems: 'center' }}>

            <MetadataRow label="Status">
              <GhostDropdown 
                value={selectedIssue.status} 
                onChange={(val) => updateTaskField('status', val)} 
                options={[{value:'To Do', label:'TO DO'}, {value:'In Progress', label:'IN PROGRESS'}, {value:'Done', label:'DONE'}]}
              />
            </MetadataRow>

            <MetadataRow label="Assignee">
              <GhostDropdown 
                value={selectedIssue.assignee} 
                onChange={(val) => updateTaskField('assignee', val)} 
                prefix={
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: 'white', backgroundColor: '#4f46e5', flexShrink: 0 }}>
                    {selectedIssue.assignee !== 'Unassigned' ? selectedIssue.assignee.charAt(0).toUpperCase() : '?'}
                  </div>
                }
                options={[
                  {value:'Unassigned', label:'Unassigned'},
                  ...users.map(u => ({ value: u.name, label: u.name }))
                ]}
              />
            </MetadataRow>

            <MetadataRow label="Priority">
              <GhostDropdown 
                value={selectedIssue.urgency || 'Medium'} 
                onChange={(val) => updateTaskField('urgency', val)} 
                prefix={
                  <span style={{ 
                    width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0, marginLeft: '4px',
                    backgroundColor: selectedIssue.urgency === 'High' ? '#ef4444' : selectedIssue.urgency === 'Medium' ? '#f59e0b' : '#71717a' 
                  }}/>
                }
                options={[{value:'Low', label:'Low'}, {value:'Medium', label:'Medium'}, {value:'High', label:'High'}]}
              />
            </MetadataRow>

            <MetadataRow label="Dates">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Start</span>
                  <input 
                    type="date" 
                    value={selectedIssue.startDate || ''} 
                    onChange={e => updateTaskField('startDate', e.target.value)} 
                    onClick={e => { try { e.target.showPicker(); } catch(err) {} }}
                    style={{ backgroundColor: 'transparent', color: '#CCC', fontSize: '14px', fontWeight: 500, border: '1px solid transparent', outline: 'none', cursor: 'text', padding: '4px 8px', borderRadius: '4px', colorScheme: 'dark' }}
                    onMouseOver={e => e.target.style.backgroundColor = '#1A1A1A'}
                    onMouseOut={e => e.target.style.backgroundColor = 'transparent'}
                  />
                </div>
                <span style={{ color: '#555' }}>→</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Due</span>
                  <input 
                    type="date" 
                    value={selectedIssue.dueDate || ''} 
                    onChange={e => updateTaskField('dueDate', e.target.value)} 
                    onClick={e => { try { e.target.showPicker(); } catch(err) {} }}
                    style={{ backgroundColor: 'transparent', color: '#CCC', fontSize: '14px', fontWeight: 500, border: '1px solid transparent', outline: 'none', cursor: 'text', padding: '4px 8px', borderRadius: '4px', colorScheme: 'dark' }}
                    onMouseOver={e => e.target.style.backgroundColor = '#1A1A1A'}
                    onMouseOut={e => e.target.style.backgroundColor = 'transparent'}
                  />
                </div>
              </div>
            </MetadataRow>

            <MetadataRow label="Time estimate">
              {editingField === 'time' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input id="time-input" autoFocus type="number" defaultValue={selectedIssue.timeEstimated || ''} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); updateTaskField('timeEstimated', e.currentTarget.value ? parseInt(e.currentTarget.value, 10) : 0); setEditingField(null);}}} style={{ borderRadius: '4px', padding: '4px 8px', fontSize: '14px', fontWeight: 500, color: 'white', outline: 'none', width: '96px', border: 'none', borderBottom: '1px solid #4f46e5', backgroundColor: '#1A1A1A', height: '30px' }} placeholder="Hours"/>
                  <button onClick={() => { const val = document.getElementById('time-input')?.value; updateTaskField('timeEstimated', val ? parseInt(val, 10) : 0); setEditingField(null); }} style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: '#4f46e5', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', height: '28px', fontWeight: 600 }}>Save</button>
                  <button onClick={() => setEditingField(null)} style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: '#333', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', height: '28px', fontWeight: 600 }}>Cancel</button>
                </div>
              ) : (
                <div onClick={()=>{setEditingField('time');}} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px 8px', marginLeft: '-8px', borderRadius: '4px', fontSize: '14px', fontWeight: 500, color: '#CCC' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#1A1A1A'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  {selectedIssue.timeEstimated ? <span>{selectedIssue.timeEstimated} hrs</span> : <span style={{ color: '#555', fontStyle: 'italic' }}>Not set</span>}
                </div>
              )}
            </MetadataRow>

            <MetadataRow label="Tags">
              {editingField === 'tags' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input id="tags-input" autoFocus type="text" defaultValue={(selectedIssue.tags||[]).join(', ')} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); const tags=e.currentTarget.value.split(',').map(t=>t.trim()).filter(Boolean); updateTaskField('tags',tags); setEditingField(null);}}} style={{ borderRadius: '4px', padding: '4px 8px', fontSize: '13px', fontWeight: 500, color: 'white', outline: 'none', width: '192px', border: 'none', borderBottom: '1px solid #4f46e5', backgroundColor: '#1A1A1A', height: '30px' }} placeholder="Comma separated..."/>
                  <button onClick={() => { const input = document.getElementById('tags-input'); if (input) { const tags=input.value.split(',').map(t=>t.trim()).filter(Boolean); updateTaskField('tags',tags); setEditingField(null); } }} style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: '#4f46e5', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', height: '28px', fontWeight: 600 }}>Save</button>
                  <button onClick={() => setEditingField(null)} style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: '#333', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', height: '28px', fontWeight: 600 }}>Cancel</button>
                </div>
              ) : (
                <div onClick={()=>{setEditingField('tags');}} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px', marginLeft: '-4px', borderRadius: '4px', flexWrap: 'wrap', minHeight: '28px', maxWidth: '400px', width: '100%' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#1A1A1A'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  {(selectedIssue.tags||[]).length > 0 ? selectedIssue.tags.map(t=>(
                    <span key={t} style={{ fontSize: '12px', fontWeight: 500, padding: '2px 10px', borderRadius: '9999px', backgroundColor: '#1E1B4B', color: '#A5B4FC', border: '1px solid #312E81' }}>{t}</span>
                  )) : <span style={{ fontSize: '13px', color: '#555', fontStyle: 'italic', padding: '0 4px' }}>Add tags...</span>}
                </div>
              )}
            </MetadataRow>

          </div>

          {/* Description */}
          <div className="flex flex-col shrink-0 gap-3 mt-2">
            <h3 className="text-[14px] font-bold text-[#EEE]">Description</h3>
            <div className="w-full relative flex flex-col transition-all duration-200">
              <textarea 
                value={editValue !== undefined && editingField === 'description' ? editValue : (selectedIssue.description || '')} 
                onFocus={() => { setEditingField('description'); setEditValue(selectedIssue.description || ''); }}
                onChange={e => setEditValue(e.target.value)} 
                onBlur={() => { if(editValue !== undefined && editValue !== selectedIssue.description) updateTaskField('description', editValue); setEditingField(null); }}
                className={`w-full min-h-[120px] text-[15px] leading-[1.6] outline-none rounded-xl p-4 resize-none transition-colors ${editingField === 'description' ? 'bg-[#151515] text-white border border-[#444] shadow-[0_0_0_2px_rgba(99,102,241,0.2)]' : 'bg-transparent text-[#CCC] hover:bg-[#151515] border border-transparent hover:border-[#333]'}`}
                placeholder="Add a more detailed description..."
              />
            </div>
          </div>

          {/* Subtasks */}
          <div className="flex flex-col shrink-0 gap-3 mt-4 mb-8">
            <h3 className="text-[14px] font-bold text-[#EEE]">Subtasks</h3>
            <div className="flex flex-col rounded-xl overflow-hidden border border-[#222] bg-[#111]">
              {selectedIssue.subtasks && selectedIssue.subtasks.map(st => (
                <div key={st.id} className="flex items-center justify-between px-4 py-3 hover:bg-[#1A1A1A] group transition-colors border-b border-[#222] last:border-b-0">
                  <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleSubtask(st.id)}>
                    <div className={`w-5 h-5 rounded-[4px] border flex items-center justify-center transition-colors ${st.completed ? 'bg-indigo-600 border-indigo-600' : 'border-[#555] group-hover:border-[#888]'}`}>
                      {st.completed && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </div>
                    <span className={`text-[14px] ${st.completed ? 'line-through text-[#666]' : 'text-[#DDD]'}`}>{st.text}</span>
                  </div>
                  <button onClick={() => deleteSubtask(st.id)} className="opacity-0 group-hover:opacity-100 text-[#666] hover:text-red-400 p-1 rounded hover:bg-[#333] transition-all">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              ))}
              <form onSubmit={addSubtask} className="px-4 py-3 bg-[#0A0A0A] border-t border-[#222]">
                <input type="text" value={newSubtaskText} onChange={e => setNewSubtaskText(e.target.value)} placeholder="+ Add new subtask..." className="w-full text-[14px] bg-transparent outline-none text-[#DDD] placeholder:text-[#666]" />
              </form>
            </div>
          </div>

        </div>

        {/* ─── RIGHT SIDEBAR ─────────────────────────────── */}
        <div className="flex flex-col shrink-0" style={{ width:'320px', backgroundColor:'#111', borderLeft:'1px solid #222' }}>
          <div className="px-5 py-4 border-b border-[#222]">
            <div className="flex items-center p-1 rounded-lg bg-[#0A0A0A] border border-[#222]">
              {['Activity','Notes'].map(tab => (
                 <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 text-[12px] font-bold py-2 rounded-md transition-all ${activeTab === tab ? 'bg-[#222] text-white shadow-sm' : 'text-[#666] hover:text-[#999]'}`}>{tab}</button>
              ))}
            </div>
          </div>

          {activeTab === 'Notes' ? (
            <div className="flex flex-col flex-1 p-5">
              <textarea value={selectedIssue.notes || ''} onChange={e => updateTaskField('notes', e.target.value)} className="flex-1 w-full border border-[#333] rounded-xl p-4 text-[14px] leading-relaxed outline-none resize-none bg-[#0A0A0A] text-[#CCC] focus:border-[#555] transition-colors" placeholder="Type internal notes here..." />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                {(selectedIssue.comments || []).map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #9333ea)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'white', fontWeight: 'bold', flexShrink: 0 }}>
                      {c.author.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', color: 'white', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.author}</span>
                        <span style={{ fontSize: '11px', color: '#888', fontWeight: 500, flexShrink: 0 }}>{formatChatTime(c.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#DDD', lineHeight: 1.5, wordBreak: 'break-word', backgroundColor: '#1A1A1A', padding: '10px 16px', borderRadius: '16px', borderTopLeftRadius: '4px', border: '1px solid #222' }}>
                        {c.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '16px', backgroundColor: '#0A0A0A', borderTop: '1px solid #222' }}>
                <form onSubmit={addComment} style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', position: 'relative' }}>
                  <textarea 
                    value={newCommentText} 
                    onChange={e => setNewCommentText(e.target.value)}
                    onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(e); } }}
                    className="custom-scrollbar"
                    style={{ width: '100%', padding: '12px 48px 12px 16px', fontSize: '14px', backgroundColor: '#1A1A1A', color: '#EEE', border: '1px solid #333', borderRadius: '16px', resize: 'none', minHeight: '44px', maxHeight: '120px', outline: 'none', transition: 'border-color 0.2s' }}
                    placeholder="Write a comment..." 
                    rows={1}
                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                    onBlur={e => e.target.style.borderColor = '#333'}
                  />
                  <button 
                    type="submit" 
                    disabled={isCommenting || !newCommentText.trim()} 
                    style={{ position: 'absolute', right: '8px', bottom: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: (!newCommentText.trim() || isCommenting) ? '#333' : '#4f46e5', color: (!newCommentText.trim() || isCommenting) ? '#888' : 'white', borderRadius: '12px', border: 'none', cursor: (!newCommentText.trim() || isCommenting) ? 'default' : 'pointer', transition: 'background-color 0.2s' }}
                    title="Send comment"
                    onMouseOver={e => { if(newCommentText.trim() && !isCommenting) e.currentTarget.style.backgroundColor = '#4338ca'; }}
                    onMouseOut={e => { if(newCommentText.trim() && !isCommenting) e.currentTarget.style.backgroundColor = '#4f46e5'; }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
      `}} />
    </div>
  );
};

export default TaskDetailModal;
