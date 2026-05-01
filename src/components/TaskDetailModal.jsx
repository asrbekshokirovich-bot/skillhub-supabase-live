import React, { useState, useEffect } from 'react';
import { Loader2, MoreHorizontal, Trash2, Check, Calendar, User, AlignLeft, Plus } from 'lucide-react';
import { taskService } from '../lib/services/taskService';
import DOMPurify from 'dompurify';
import { useSystem } from './SystemUI';

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

const GhostDropdown = ({ value, onChange, options, prefix }) => {
  const selectedLabel = options.find(opt => opt.value === value)?.label || value;
  return (
    <div 
      style={{ display: 'flex', width: 'fit-content', alignItems: 'center', position: 'relative', marginLeft: '-8px', borderRadius: '4px', transition: 'background-color 0.2s', padding: '4px 8px' }}
      onMouseOver={e => e.currentTarget.style.backgroundColor = '#1A1A1A'}
      onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      {prefix && <div style={{ marginRight: '8px' }}>{prefix}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#E5E7EB', fontSize: '14px', fontWeight: 500 }}>
          {selectedLabel}
        </span>
        <svg style={{ color: '#888' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', zIndex: 1 }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} style={{ backgroundColor: '#111', color: 'white' }}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};

const TaskDetailModal = ({ 
  issue, 
  projectId, 
  users, 
  currentUser, 
  projectDetails,
  onClose, 
  onIssueUpdated,
  onIssueDeleted
}) => {
  const { toast, showConfirm } = useSystem();
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [activeTab, setActiveTab] = useState('Activity');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [expandedSubtaskId, setExpandedSubtaskId] = useState(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editSubtaskName, setEditSubtaskName] = useState('');
  const [editSubtaskDesc, setEditSubtaskDesc] = useState('');
  const [editNotes, setEditNotes] = useState(issue.notes || '');


  const selectedIssue = issue;
  const rawDesc = selectedIssue.description || '';
  const cleanDesc = rawDesc.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const isEmptyDesc = !cleanDesc;

  const updateTaskField = async (field, value) => {
    try {
      if (issue[field] === value) return;
      await taskService.updateTask(projectId, issue.id, { [field]: value });
      onIssueUpdated({ ...issue, [field]: value });
    } catch (err) {
      console.error(err);
      toast.error('Failed to update task: ' + err.message);
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
      toast.error('Failed to update task: ' + err.message);
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
      toast.error('Failed to update task: ' + err.message);
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
      toast.error('Failed to update task: ' + err.message);
    }
  };

  const updateSubtaskField = async (subtaskId, field, value) => {
    try {
      const updatedSubtasks = (issue.subtasks || []).map(st => 
        st.id === subtaskId ? { ...st, [field]: value } : st
      );
      await taskService.updateTask(projectId, issue.id, { subtasks: updatedSubtasks });
      onIssueUpdated({ ...issue, subtasks: updatedSubtasks });
    } catch (err) {
      console.error(err);
      toast.error('Failed to update task: ' + err.message);
    }
  };

  const deleteSubtask = async (subtaskId) => {
    try {
      const updatedSubtasks = (issue.subtasks || []).filter(st => st.id !== subtaskId);
      await taskService.updateTask(projectId, issue.id, { subtasks: updatedSubtasks });
      onIssueUpdated({ ...issue, subtasks: updatedSubtasks });
    } catch (err) {
      console.error(err);
      toast.error('Failed to update task: ' + err.message);
    }
  };

  const handleRichTextPaste = (e) => {
    e.preventDefault();
    let html = e.clipboardData.getData('text/html');
    let text = e.clipboardData.getData('text/plain');

    if (html) {
      const cleanHtml = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'blockquote', 'span', 'div', 'h1', 'h2', 'h3'],
        ALLOWED_ATTR: ['href', 'target'],
        KEEP_CONTENT: true
      });
      document.execCommand('insertHTML', false, cleanHtml);
    } else if (text) {
      const cleanText = text.replace(/\n/g, '<br>');
      document.execCommand('insertHTML', false, cleanText);
    }
  };

  const isDirty = Boolean(
    editingField || 
    editingSubtaskId || 
    newSubtaskText.trim() !== '' || 
    newCommentText.trim() !== ''
  );

  const handleClose = React.useCallback(async () => {
    if (isDirty) {
      const discard = await showConfirm('You have unsaved edits. Discard changes?', 'Discard Changes?');
      if (!discard) return;
    }
    onClose();
  }, [isDirty, onClose, showConfirm]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !editingField && !editingSubtaskId) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, editingField, editingSubtaskId]);

  return (
    <div className="fixed inset-0 z-[100] animate-fade-in flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={handleClose}>
      <div className="task-modal-layout relative flex shadow-2xl" style={{ width: '95vw', maxWidth: '1100px', height: '90vh', maxHeight: '90vh', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

        {/* ─── LEFT: main content ─────────────────────────────── */}
        <div className="flex flex-col flex-1 custom-scrollbar" style={{ overflowY: 'auto', padding: '32px', gap: '24px', minHeight: 0, height: '100%' }}>

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
            <div className="flex items-center gap-2 shrink-0">

              <button className="p-2 hover:bg-[var(--bg-secondary)] rounded-md transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={handleClose} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>

          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: '16px', columnGap: '8px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>

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
                    {selectedIssue.assignee !== 'Unassigned' ? (users.find(u => u.id === selectedIssue.assignee)?.name || '?').charAt(0).toUpperCase() : '?'}
                  </div>
                }
                options={[
                  {value:'Unassigned', label:'Unassigned'},
                  ...users.map(u => ({ value: u.id, label: u.name }))
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
                    style={{ backgroundColor: 'transparent', color: '#CCC', fontSize: '14px', fontWeight: 500, border: '1px solid transparent', outline: 'none', cursor: 'text', padding: '4px 8px', borderRadius: '4px', colorScheme: 'dark', height: '28px' }}
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
                    style={{ backgroundColor: 'transparent', color: '#CCC', fontSize: '14px', fontWeight: 500, border: '1px solid transparent', outline: 'none', cursor: 'text', padding: '4px 8px', borderRadius: '4px', colorScheme: 'dark', height: '28px' }}
                    onMouseOver={e => e.target.style.backgroundColor = '#1A1A1A'}
                    onMouseOut={e => e.target.style.backgroundColor = 'transparent'}
                  />
                </div>
              </div>
            </MetadataRow>

            <MetadataRow label="Time estimate">
              {editingField === 'time' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input id="time-input" autoFocus type="number" defaultValue={selectedIssue.timeEstimated || ''} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); updateTaskField('timeEstimated', e.currentTarget.value ? parseInt(e.currentTarget.value, 10) : 0); setEditingField(null);}}} style={{ borderRadius: '4px', padding: '4px 8px', fontSize: '14px', fontWeight: 500, color: 'white', outline: 'none', width: '96px', border: '1px solid #4f46e5', backgroundColor: '#111', height: '28px' }} placeholder="Hours"/>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%', maxWidth: '400px' }}>
                {(selectedIssue.tags||[]).map(t => (
                  <span key={t} style={{ fontSize: '12px', fontWeight: 500, padding: '2px 6px 2px 10px', borderRadius: '9999px', backgroundColor: '#1E1B4B', color: '#A5B4FC', border: '1px solid #312E81', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {t}
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateTaskField('tags', selectedIssue.tags.filter(tag => tag !== t)); }} 
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#A5B4FC', padding: 0, transition: 'background-color 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                      title="Remove tag"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </span>
                ))}
                
                {editingField === 'tags' ? (
                  <input 
                    id="tags-input" 
                    autoFocus 
                    type="text" 
                    onBlur={() => {
                      const input = document.getElementById('tags-input');
                      if (input) {
                        const newTag = input.value.trim();
                        if (newTag && !(selectedIssue.tags||[]).includes(newTag)) {
                          updateTaskField('tags', [...(selectedIssue.tags||[]), newTag]);
                        }
                      }
                      setEditingField(null);
                    }}
                    onKeyDown={e => {
                      if(e.key === 'Enter') {
                        e.preventDefault(); 
                        const newTag = e.currentTarget.value.trim();
                        if (newTag && !(selectedIssue.tags||[]).includes(newTag)) {
                          updateTaskField('tags', [...(selectedIssue.tags||[]), newTag]);
                        }
                        e.currentTarget.value = '';
                      } else if (e.key === 'Escape') {
                        setEditingField(null);
                      }
                    }} 
                    style={{ minWidth: '100px', flex: 1, background: '#111', border: '1px solid #4f46e5', color: 'white', outline: 'none', fontSize: '13px', padding: '4px 10px', borderRadius: '9999px', height: '28px', boxShadow: '0 0 0 2px rgba(79,70,229,0.2)' }} 
                    placeholder="Type tag & press Enter"
                  />
                ) : (
                  <button 
                    onClick={() => setEditingField('tags')}
                    style={{ fontSize: '12px', fontWeight: 500, padding: '4px 10px', borderRadius: '9999px', backgroundColor: '#111', color: '#AAA', border: '1px dashed #444', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s', height: '28px' }}
                    onMouseOver={e => { e.currentTarget.style.color = '#FFF'; e.currentTarget.style.borderColor = '#666'; e.currentTarget.style.backgroundColor = '#1A1A1A'; }}
                    onMouseOut={e => { e.currentTarget.style.color = '#AAA'; e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.backgroundColor = '#111'; }}
                    title="Add new tag"
                  >
                    <Plus size={12} strokeWidth={3} />
                    Add Tag
                  </button>
                )}
              </div>
            </MetadataRow>

          </div>

          {/* Description */}
          <div className="flex flex-col shrink-0 gap-3 mt-2">
            <h3 className="text-[14px] font-bold text-[#EEE]">Description</h3>
            <div className="w-full relative flex flex-col transition-all duration-200">
              <div 
                id="desc-placeholder"
                className="absolute top-0 left-0 w-full h-full p-4"
                style={{ color: '#666', fontStyle: 'italic', fontSize: '15px', display: isEmptyDesc ? 'block' : 'none', pointerEvents: 'none', zIndex: 10 }}
              >
                Add description...
              </div>
              <div 
                contentEditable
                suppressContentEditableWarning
                onBlur={e => { 
                  const html = e.currentTarget.innerHTML;
                  if(html !== selectedIssue.description) updateTaskField('description', html);
                  e.currentTarget.style.boxShadow = 'none';
                  const isEmp = !e.currentTarget.textContent.trim();
                  if (isEmp) {
                    e.currentTarget.style.backgroundColor = '#111111';
                    e.currentTarget.style.borderColor = '#333333';
                  } else {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
                onFocus={e => {
                  e.currentTarget.style.backgroundColor = '#151515';
                  e.currentTarget.style.borderColor = '#444';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.2)';
                }}
                onInput={e => {
                  const isEmp = !e.currentTarget.textContent.trim();
                  const ph = document.getElementById('desc-placeholder');
                  if (ph) ph.style.display = isEmp ? 'block' : 'none';
                }}
                onPaste={handleRichTextPaste}
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(
                    (selectedIssue.description || '').includes('<') 
                      ? selectedIssue.description 
                      : (selectedIssue.description || '').replace(/\n/g, '<br>')
                  )
                }}
                className="w-full text-[15px] leading-[1.6] outline-none rounded-xl p-4 transition-colors overflow-y-auto rich-text-editor custom-scrollbar cursor-text"
                style={{ 
                  whiteSpace: 'normal', 
                  wordBreak: 'break-word', 
                  minHeight: '120px',
                  backgroundColor: isEmptyDesc ? '#111111' : 'transparent',
                  border: isEmptyDesc ? '1px solid #333333' : '1px solid transparent',
                  color: '#CCC'
                }}
                onMouseOver={e => {
                  if (document.activeElement !== e.currentTarget) {
                    e.currentTarget.style.backgroundColor = '#151515';
                    e.currentTarget.style.borderColor = '#333333';
                  }
                }}
                onMouseOut={e => {
                  if (document.activeElement !== e.currentTarget) {
                    const isEmp = !e.currentTarget.textContent.trim();
                    e.currentTarget.style.backgroundColor = isEmp ? '#111111' : 'transparent';
                    e.currentTarget.style.borderColor = isEmp ? '#333333' : 'transparent';
                  }
                }}
              />
            </div>
          </div>

          {/* Subtasks */}
          <div className="flex flex-col shrink-0 gap-3 mt-4 mb-8" style={{ marginTop: '1rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#EEE' }}>Subtasks</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden', border: '1px solid #333', backgroundColor: '#0A0A0A', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              {selectedIssue.subtasks && selectedIssue.subtasks.map(st => (
                <div key={st.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #222' }}>
                  
                  {/* Main Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#111', width: '100%', gap: '16px', transition: 'background-color 0.2s' }}>
                    
                    {/* Robust Checkbox - ALWAYS VISIBLE */}
                    <button 
                      onClick={() => toggleSubtask(st.id)}
                      style={{
                        flexShrink: 0,
                        width: '22px',
                        height: '22px',
                        minWidth: '22px',
                        minHeight: '22px',
                        borderRadius: '6px',
                        border: st.completed ? '2px solid #4f46e5' : '2px solid #888',
                        backgroundColor: st.completed ? '#4f46e5' : '#1A1A1A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: st.completed ? '0 0 10px rgba(79,70,229,0.3)' : 'none',
                        outline: 'none',
                        padding: 0
                      }}
                      title="Mark as complete"
                    >
                      {st.completed && <Check size={14} color="white" strokeWidth={3} />}
                    </button>
                    
                    {/* Subtask Title */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingSubtaskId === st.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={editSubtaskName}
                          onChange={e => setEditSubtaskName(e.target.value)}
                          onBlur={() => {
                            if (editSubtaskName.trim() && editSubtaskName.trim() !== st.text) {
                              updateSubtaskField(st.id, 'text', editSubtaskName.trim());
                            }
                            setEditingSubtaskId(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              if (editSubtaskName.trim() && editSubtaskName.trim() !== st.text) {
                                updateSubtaskField(st.id, 'text', editSubtaskName.trim());
                              }
                              setEditingSubtaskId(null);
                            } else if (e.key === 'Escape') {
                              setEditingSubtaskId(null);
                            }
                          }}
                          style={{
                            width: '100%',
                            backgroundColor: '#222',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            border: '1px solid #4f46e5',
                            fontSize: '14px',
                            color: 'white',
                            outline: 'none',
                            boxShadow: '0 0 0 2px rgba(79,70,229,0.2)'
                          }}
                        />
                      ) : (
                        <span 
                          onClick={() => { setEditingSubtaskId(st.id); setEditSubtaskName(st.text); }}
                          title="Click to edit subtask name"
                          style={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '14px',
                            cursor: 'text',
                            userSelect: 'none',
                            padding: '6px 0',
                            textDecoration: st.completed ? 'line-through' : 'none',
                            color: st.completed ? '#666' : '#E5E7EB',
                            transition: 'color 0.2s'
                          }}
                        >
                          {st.text}
                        </span>
                      )}
                    </div>

                    {/* Actions Panel - ALWAYS VISIBLE */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <button 
                        onClick={() => {
                          if (expandedSubtaskId === st.id) {
                            setExpandedSubtaskId(null);
                          } else {
                            setExpandedSubtaskId(st.id);
                            setEditSubtaskDesc(st.description || '');
                          }
                        }} 
                        title="Edit Details"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          minWidth: '32px',
                          minHeight: '32px',
                          borderRadius: '8px',
                          transition: 'all 0.2s',
                          backgroundColor: expandedSubtaskId === st.id ? 'rgba(79,70,229,0.2)' : '#222',
                          color: expandedSubtaskId === st.id ? '#818cf8' : '#AAA',
                          border: expandedSubtaskId === st.id ? '1px solid rgba(79,70,229,0.3)' : '1px solid #333',
                          cursor: 'pointer'
                        }}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail View */}
                  {expandedSubtaskId === st.id && (
                    <div style={{ padding: '20px', backgroundColor: '#050505', borderTop: '1px solid #222', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
                      
                      {/* Delete Button - Moved to inside Expanded View for cleanliness */}
                      <button 
                        onClick={() => deleteSubtask(st.id)} 
                        title="Delete Subtask"
                        style={{
                          position: 'absolute',
                          top: '16px',
                          right: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#f87171',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          letterSpacing: '0.05em',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          border: 'none'
                        }}
                      >
                        <Trash2 size={14} /> DELETE
                      </button>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', width: '100%', paddingRight: '100px' }}>
                        {/* Assignee Field */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={12} color="#666" /> Assignee
                          </label>
                          <div style={{ height: '32px', display: 'flex', alignItems: 'center' }}>
                            <GhostDropdown 
                              value={st.assignee || 'Unassigned'} 
                              onChange={(val) => updateSubtaskField(st.id, 'assignee', val)} 
                              options={[{value:'Unassigned', label:'Unassigned'}, ...(users || []).map(u => ({ value: u.id, label: u.name }))]}
                            />
                          </div>
                        </div>

                        {/* Due Date Field */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={12} color="#666" /> Due Date
                          </label>
                          <div style={{ height: '32px', display: 'flex', alignItems: 'center', paddingLeft: '4px' }}>
                            <input 
                              type="date" 
                              value={st.dueDate || ''} 
                              onChange={e => updateSubtaskField(st.id, 'dueDate', e.target.value)} 
                              style={{ backgroundColor: 'transparent', color: '#E5E7EB', fontSize: '14px', fontWeight: 500, border: 'none', outline: 'none', cursor: 'pointer', colorScheme: 'dark', padding: 0 }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Description Field */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                        <label style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlignLeft size={12} color="#666" /> Description
                        </label>
                        <div 
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={e => {
                            const html = e.currentTarget.innerHTML;
                            if (html !== (st.description || '')) {
                              updateSubtaskField(st.id, 'description', html);
                            }
                          }}
                          onPaste={handleRichTextPaste}
                          dangerouslySetInnerHTML={{ 
                            __html: DOMPurify.sanitize(
                              (st.description || '').includes('<') 
                                ? st.description 
                                : (st.description || '').replace(/\n/g, '<br>')
                            )
                          }}
                          className="rich-text-editor custom-scrollbar"
                          style={{
                            width: '100%',
                            backgroundColor: '#111',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            padding: '12px',
                            fontSize: '13px',
                            color: '#E5E7EB',
                            outline: 'none',
                            minHeight: '90px',
                            transition: 'all 0.2s',
                            fontFamily: 'inherit',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            overflowY: 'auto'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Add New Subtask Input */}
              <form onSubmit={addSubtask} style={{ padding: '16px', backgroundColor: '#0A0A0A', borderTop: '1px solid #333', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'text', transition: 'background-color 0.2s' }} onClick={() => document.getElementById('new-subtask-input')?.focus()}>
                <Plus size={18} color="#666" />
                <input 
                  id="new-subtask-input"
                  type="text" 
                  value={newSubtaskText} 
                  onChange={e => setNewSubtaskText(e.target.value)} 
                  placeholder="Add new subtask..." 
                  style={{ width: '100%', fontSize: '14px', backgroundColor: 'transparent', border: 'none', outline: 'none', color: '#DDD' }} 
                />
              </form>
            </div>
          </div>

        </div>

        {/* ─── RIGHT SIDEBAR ─────────────────────────────── */}
        <div className="flex flex-col shrink-0" style={{ width:'320px', backgroundColor:'var(--bg-secondary)', borderLeft:'1px solid var(--border-color)' }}>
          <div className="px-5 py-4 border-b border-[var(--border-color)]">
            <div style={{ display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
              {['Activity','Notes'].map(tab => (
                 <button 
                   key={tab} 
                   onClick={() => setActiveTab(tab)} 
                   style={{
                     flex: 1, 
                     fontSize: '12px', 
                     fontWeight: '600', 
                     padding: '8px 0', 
                     borderRadius: '6px', 
                     transition: 'all 0.2s',
                     border: activeTab === tab ? '1px solid #333' : '1px solid transparent',
                     cursor: 'pointer',
                     backgroundColor: activeTab === tab ? '#1A1A1A' : 'transparent',
                     color: activeTab === tab ? '#FFF' : '#888',
                     boxShadow: activeTab === tab ? '0 2px 4px rgba(0,0,0,0.4)' : 'none'
                   }}
                   onMouseOver={e => { if(activeTab !== tab) e.currentTarget.style.color = '#CCC'; }}
                   onMouseOut={e => { if(activeTab !== tab) e.currentTarget.style.color = '#888'; }}
                 >
                   {tab}
                 </button>
              ))}
            </div>
          </div>

          {activeTab === 'Notes' ? (
            <div className="flex flex-col flex-1 p-5" style={{ minHeight: 0 }}>
              <div 
                contentEditable
                suppressContentEditableWarning
                onBlur={e => { 
                  const html = e.currentTarget.innerHTML;
                  if (html !== (selectedIssue.notes || '')) { 
                    updateTaskField('notes', html); 
                  }
                }}
                onPaste={handleRichTextPaste}
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(
                    (selectedIssue.notes || '').includes('<') 
                      ? selectedIssue.notes 
                      : (selectedIssue.notes || '').replace(/\n/g, '<br>')
                  )
                }}
                className="flex-1 w-full border border-[#333] rounded-xl p-4 text-[13px] leading-[1.6] outline-none bg-[#0A0A0A] text-[#CCC] focus:border-[#555] transition-colors rich-text-editor custom-scrollbar" 
                style={{ whiteSpace: 'normal', wordBreak: 'break-word', overflowY: 'auto', minHeight: 0 }}
              />
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
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)' }}>
                <form onSubmit={addComment} style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', position: 'relative' }}>
                  <textarea 
                    value={newCommentText} 
                    onChange={e => setNewCommentText(e.target.value)}
                    onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(e); } }}
                    className="custom-scrollbar"
                    style={{ width: '100%', padding: '12px 48px 12px 16px', fontSize: '14px', backgroundColor: '#0A0A0A', color: '#EEE', border: '1px solid #333', borderRadius: '16px', resize: 'none', minHeight: '44px', maxHeight: '120px', outline: 'none', transition: 'border-color 0.2s' }}
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
        
        .rich-text-editor {
          overflow-x: hidden !important;
          outline: none !important;
        }
        .rich-text-editor:focus {
          outline: none !important;
          box-shadow: inset 0 0 0 1px #555 !important;
        }
        .rich-text-editor * {
          font-size: inherit !important;
          font-family: inherit !important;
          line-height: inherit !important;
        }
        .rich-text-editor p, .rich-text-editor div {
          margin-top: 0 !important;
          margin-bottom: 0.5em !important;
        }
        .rich-text-editor ul {
          list-style-type: disc !important;
          padding-left: 24px !important;
          margin-top: 0.5em !important;
          margin-bottom: 0.5em !important;
        }
        .rich-text-editor ol {
          list-style-type: decimal !important;
          padding-left: 24px !important;
          margin-top: 0.5em !important;
          margin-bottom: 0.5em !important;
        }
        .rich-text-editor li {
          display: list-item !important;
          margin-bottom: 0.25em !important;
        }
        .rich-text-editor li > p, .rich-text-editor li > div {
          display: inline !important;
          margin: 0 !important;
        }
        .rich-text-editor blockquote {
          border-left: 3px solid #6366f1 !important;
          padding-left: 12px !important;
          margin: 1em 0 !important;
          color: #999 !important;
          font-style: italic !important;
        }
        .rich-text-editor a {
          color: #6366f1 !important;
          text-decoration: underline !important;
        }
        .rich-text-editor strong, .rich-text-editor b {
          font-weight: 700 !important;
        }
        .rich-text-editor em, .rich-text-editor i {
          font-style: italic !important;
        }
      `}} />
    </div>
  );
};

export default TaskDetailModal;
