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
          <div className="flex flex-col shrink-0 gap-4 pb-6 border-b border-[#222]">

            {/* Status */}
            <div className="flex items-center min-h-[36px]">
              <div className="w-[140px] shrink-0 text-[13px] font-medium text-[#888]">Status</div>
              <div className="flex-1">
                <select
                  value={selectedIssue.status}
                  onChange={(e) => updateTaskField('status', e.target.value)}
                  className="bg-[#1A1A1A] text-white text-[13px] font-semibold px-3 py-1.5 rounded-md border border-[#333] outline-none cursor-pointer hover:border-[#555] transition-colors appearance-none min-w-[120px]"
                >
                  <option value="To Do">TO DO</option>
                  <option value="In Progress">IN PROGRESS</option>
                  <option value="Done">DONE</option>
                </select>
              </div>
            </div>

            {/* Assignee */}
            <div className="flex items-center min-h-[36px]">
              <div className="w-[140px] shrink-0 text-[13px] font-medium text-[#888]">Assignee</div>
              <div className="flex-1 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-indigo-600">
                  {selectedIssue.assignee !== 'Unassigned' ? selectedIssue.assignee.charAt(0).toUpperCase() : '?'}
                </div>
                <select
                  value={selectedIssue.assignee}
                  onChange={(e) => updateTaskField('assignee', e.target.value)}
                  className="bg-transparent text-[#E5E7EB] text-[14px] font-medium outline-none cursor-pointer hover:text-white transition-colors appearance-none py-1"
                >
                  <option value="Unassigned" className="bg-[#111]">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.name} className="bg-[#111]">{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority */}
            <div className="flex items-center min-h-[36px]">
              <div className="w-[140px] shrink-0 text-[13px] font-medium text-[#888]">Priority</div>
              <div className="flex-1 flex items-center gap-2">
                <span style={{ 
                  width: 8, height: 8, borderRadius: '50%', display: 'inline-block', 
                  backgroundColor: selectedIssue.urgency === 'High' ? '#ef4444' : selectedIssue.urgency === 'Medium' ? '#f59e0b' : '#71717a' 
                }}/>
                <select
                  value={selectedIssue.urgency || 'Medium'}
                  onChange={(e) => updateTaskField('urgency', e.target.value)}
                  className="bg-transparent text-[#E5E7EB] text-[14px] font-medium outline-none cursor-pointer hover:text-white transition-colors appearance-none py-1"
                >
                  <option value="Low" className="bg-[#111]">Low</option>
                  <option value="Medium" className="bg-[#111]">Medium</option>
                  <option value="High" className="bg-[#111]">High</option>
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-center min-h-[36px]">
              <div className="w-[140px] shrink-0 text-[13px] font-medium text-[#888]">Dates</div>
              <div className="flex-1 flex items-center gap-2 text-[14px]">
                <input 
                  type="date" 
                  value={selectedIssue.startDate || ''} 
                  onChange={e => updateTaskField('startDate', e.target.value)} 
                  className="bg-transparent text-[#CCC] outline-none cursor-pointer hover:text-white font-medium" 
                  style={{ colorScheme: 'dark' }} 
                />
                <span className="text-[#555] mx-1">→</span>
                <input 
                  type="date" 
                  value={selectedIssue.dueDate || ''} 
                  onChange={e => updateTaskField('dueDate', e.target.value)} 
                  className="bg-transparent text-[#CCC] outline-none cursor-pointer hover:text-white font-medium" 
                  style={{ colorScheme: 'dark' }} 
                />
              </div>
            </div>

            {/* Time Estimate */}
            <div className="flex items-center min-h-[36px]">
              <div className="w-[140px] shrink-0 text-[13px] font-medium text-[#888]">Time estimate</div>
              <div className="flex-1 flex items-center">
                {editingField === 'time' ? (
                  <input autoFocus type="number" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>{updateTaskField('timeEstimated', editValue ? parseInt(editValue, 10) : 0); setEditingField(null);}} onKeyDown={e=>{if(e.key==='Enter')e.target.blur();}} className="rounded px-2 text-[14px] font-medium text-white outline-none w-24 border-b border-indigo-500 bg-[#1A1A1A] h-[28px]"/>
                ) : (
                  <div onClick={()=>{setEditingField('time');setEditValue(selectedIssue.timeEstimated||'');}} className="flex items-center cursor-pointer hover:bg-[#1A1A1A] px-2 py-1 -ml-2 rounded transition-colors text-[14px] font-medium text-[#CCC]">
                    {selectedIssue.timeEstimated ? <span>{selectedIssue.timeEstimated} hrs</span> : <span className="text-[#555] italic">Not set</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="flex items-center min-h-[36px]">
              <div className="w-[140px] shrink-0 text-[13px] font-medium text-[#888]">Tags</div>
              <div className="flex-1 flex items-center flex-wrap gap-2">
                {editingField === 'tags' ? (
                  <input autoFocus type="text" defaultValue={(selectedIssue.tags||[]).join(', ')} onBlur={e=>{const tags=e.target.value.split(',').map(t=>t.trim()).filter(Boolean);updateTaskField('tags',tags);setEditingField(null);}} onKeyDown={e=>{if(e.key==='Enter')e.target.blur();}} className="rounded px-2 text-[13px] font-medium text-white outline-none w-48 border-b border-indigo-500 bg-[#1A1A1A] h-[28px]" placeholder="Comma separated..."/>
                ) : (
                  <div onClick={()=>{setEditingField('tags');}} className="flex items-center gap-1.5 cursor-pointer hover:bg-[#1A1A1A] p-1 -ml-1 rounded transition-colors flex-wrap min-h-[28px] w-full max-w-[400px]">
                    {(selectedIssue.tags||[]).length > 0 ? selectedIssue.tags.map(t=>(
                      <span key={t} className="text-[12px] font-medium px-2.5 py-0.5 rounded-full bg-[#1E1B4B] text-[#A5B4FC] border border-[#312E81]">{t}</span>
                    )) : <span className="text-[13px] text-[#555] italic px-1">Add tags...</span>}
                  </div>
                )}
              </div>
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
