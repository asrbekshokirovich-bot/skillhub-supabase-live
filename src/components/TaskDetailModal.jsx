import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { taskService } from '../lib/services/taskService';

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

            {/* Status */}
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#888' }}>Status</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <select
                value={selectedIssue.status}
                onChange={(e) => updateTaskField('status', e.target.value)}
                style={{ backgroundColor: 'transparent', color: 'white', fontSize: '13px', fontWeight: 'bold', border: 'none', outline: 'none', cursor: 'pointer', padding: '4px 8px', marginLeft: '-8px', borderRadius: '4px', appearance: 'none', WebkitAppearance: 'none' }}
                onMouseOver={e => e.target.style.backgroundColor = '#1A1A1A'}
                onMouseOut={e => e.target.style.backgroundColor = 'transparent'}
              >
                <option value="To Do" style={{ backgroundColor: '#111', color: 'white' }}>TO DO</option>
                <option value="In Progress" style={{ backgroundColor: '#111', color: 'white' }}>IN PROGRESS</option>
                <option value="Done" style={{ backgroundColor: '#111', color: 'white' }}>DONE</option>
              </select>
            </div>

            {/* Assignee */}
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#888' }}>Assignee</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: 'white', backgroundColor: '#4f46e5', flexShrink: 0 }}>
                {selectedIssue.assignee !== 'Unassigned' ? selectedIssue.assignee.charAt(0).toUpperCase() : '?'}
              </div>
              <select
                value={selectedIssue.assignee}
                onChange={(e) => updateTaskField('assignee', e.target.value)}
                style={{ backgroundColor: 'transparent', color: '#E5E7EB', fontSize: '14px', fontWeight: 500, border: 'none', outline: 'none', cursor: 'pointer', padding: '4px 8px', marginLeft: '-8px', borderRadius: '4px', appearance: 'none', WebkitAppearance: 'none' }}
                onMouseOver={e => e.target.style.backgroundColor = '#1A1A1A'}
                onMouseOut={e => e.target.style.backgroundColor = 'transparent'}
              >
                <option value="Unassigned" style={{ backgroundColor: '#111', color: 'white' }}>Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.name} style={{ backgroundColor: '#111', color: 'white' }}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#888' }}>Priority</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ 
                width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
                backgroundColor: selectedIssue.urgency === 'High' ? '#ef4444' : selectedIssue.urgency === 'Medium' ? '#f59e0b' : '#71717a' 
              }}/>
              <select
                value={selectedIssue.urgency || 'Medium'}
                onChange={(e) => updateTaskField('urgency', e.target.value)}
                style={{ backgroundColor: 'transparent', color: '#E5E7EB', fontSize: '14px', fontWeight: 500, border: 'none', outline: 'none', cursor: 'pointer', padding: '4px 8px', marginLeft: '-8px', borderRadius: '4px', appearance: 'none', WebkitAppearance: 'none' }}
                onMouseOver={e => e.target.style.backgroundColor = '#1A1A1A'}
                onMouseOut={e => e.target.style.backgroundColor = 'transparent'}
              >
                <option value="Low" style={{ backgroundColor: '#111', color: 'white' }}>Low</option>
                <option value="Medium" style={{ backgroundColor: '#111', color: 'white' }}>Medium</option>
                <option value="High" style={{ backgroundColor: '#111', color: 'white' }}>High</option>
              </select>
            </div>

            {/* Dates */}
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#888' }}>Dates</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input 
                type="date" 
                value={selectedIssue.startDate || ''} 
                onChange={e => updateTaskField('startDate', e.target.value)} 
                style={{ backgroundColor: 'transparent', color: '#CCC', fontSize: '14px', fontWeight: 500, border: 'none', outline: 'none', cursor: 'pointer', padding: '4px 8px', marginLeft: '-8px', borderRadius: '4px', colorScheme: 'dark' }}
                onMouseOver={e => e.target.style.backgroundColor = '#1A1A1A'}
                onMouseOut={e => e.target.style.backgroundColor = 'transparent'}
              />
              <span style={{ color: '#555' }}>→</span>
              <input 
                type="date" 
                value={selectedIssue.dueDate || ''} 
                onChange={e => updateTaskField('dueDate', e.target.value)} 
                style={{ backgroundColor: 'transparent', color: '#CCC', fontSize: '14px', fontWeight: 500, border: 'none', outline: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', colorScheme: 'dark' }}
                onMouseOver={e => e.target.style.backgroundColor = '#1A1A1A'}
                onMouseOut={e => e.target.style.backgroundColor = 'transparent'}
              />
            </div>

            {/* Time Estimate */}
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#888' }}>Time estimate</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {editingField === 'time' ? (
                <input autoFocus type="number" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>{updateTaskField('timeEstimated', editValue ? parseInt(editValue, 10) : 0); setEditingField(null);}} onKeyDown={e=>{if(e.key==='Enter')e.target.blur();}} style={{ borderRadius: '4px', padding: '4px 8px', fontSize: '14px', fontWeight: 500, color: 'white', outline: 'none', width: '96px', border: 'none', borderBottom: '1px solid #4f46e5', backgroundColor: '#1A1A1A', height: '30px' }}/>
              ) : (
                <div onClick={()=>{setEditingField('time');setEditValue(selectedIssue.timeEstimated||'');}} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px 8px', marginLeft: '-8px', borderRadius: '4px', fontSize: '14px', fontWeight: 500, color: '#CCC' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#1A1A1A'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  {selectedIssue.timeEstimated ? <span>{selectedIssue.timeEstimated} hrs</span> : <span style={{ color: '#555', fontStyle: 'italic' }}>Not set</span>}
                </div>
              )}
            </div>

            {/* Tags */}
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#888' }}>Tags</div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              {editingField === 'tags' ? (
                <input autoFocus type="text" defaultValue={(selectedIssue.tags||[]).join(', ')} onBlur={e=>{const tags=e.target.value.split(',').map(t=>t.trim()).filter(Boolean);updateTaskField('tags',tags);setEditingField(null);}} onKeyDown={e=>{if(e.key==='Enter')e.target.blur();}} style={{ borderRadius: '4px', padding: '4px 8px', fontSize: '13px', fontWeight: 500, color: 'white', outline: 'none', width: '192px', border: 'none', borderBottom: '1px solid #4f46e5', backgroundColor: '#1A1A1A', height: '30px' }} placeholder="Comma separated..."/>
              ) : (
                <div onClick={()=>{setEditingField('tags');}} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px', marginLeft: '-4px', borderRadius: '4px', flexWrap: 'wrap', minHeight: '28px', maxWidth: '400px', width: '100%' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#1A1A1A'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  {(selectedIssue.tags||[]).length > 0 ? selectedIssue.tags.map(t=>(
                    <span key={t} style={{ fontSize: '12px', fontWeight: 500, padding: '2px 10px', borderRadius: '9999px', backgroundColor: '#1E1B4B', color: '#A5B4FC', border: '1px solid #312E81' }}>{t}</span>
                  )) : <span style={{ fontSize: '13px', color: '#555', fontStyle: 'italic', padding: '0 4px' }}>Add tags...</span>}
                </div>
              )}
            </div>

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
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto flex flex-col gap-5 p-5">
                {(selectedIssue.comments || []).map(c => (
                  <div key={c.id} className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-indigo-900 border border-indigo-700 flex items-center justify-center text-[12px] text-indigo-200 shrink-0 font-bold">{c.author.charAt(0).toUpperCase()}</div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[13px] text-[#EEE] font-bold">{c.author}</span>
                        {c.createdAt && <span className="text-[11px] text-[#666]">{new Date(c.createdAt).toLocaleDateString()}</span>}
                      </div>
                      <div className="text-[14px] text-[#CCC] leading-relaxed break-words">{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-[#0A0A0A] border-t border-[#222]">
                <form onSubmit={addComment} className="flex flex-col rounded-xl border border-[#333] bg-[#111] overflow-hidden focus-within:border-[#555] transition-colors">
                  <textarea value={newCommentText} onChange={e => setNewCommentText(e.target.value)} className="w-full px-4 py-3 text-[14px] bg-transparent text-[#EEE] border-none resize-none min-h-[80px] outline-none placeholder:text-[#666]" placeholder="Write a comment..." />
                  <div className="flex justify-end p-2 border-t border-[#222]">
                    <button type="submit" disabled={isCommenting || !newCommentText.trim()} className="px-4 py-1.5 text-[13px] font-bold bg-white text-black hover:bg-gray-200 rounded-md disabled:opacity-50 transition-colors">Comment</button>
                  </div>
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
