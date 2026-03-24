import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { taskService } from '../lib/services/taskService';
import { storageService } from '../lib/services/storageService';

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
  const [activePopover, setActivePopover] = useState(null);
  const [activeTab, setActiveTab] = useState('Activity');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [isUploadingMidTask, setIsUploadingMidTask] = useState(false);

  const selectedIssue = issue;

  const updateTaskField = async (field, value) => {
    try {
      if (issue[field] === value) return;
      await taskService.updateTask(projectId, issue.id, { [field]: value });
      onIssueUpdated({ ...issue, [field]: value });
    } catch (err) {
      console.error(err);
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
    } finally {
      setIsCommenting(false);
    }
  };

  const uploadMidTaskScreenshot = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingMidTask(true);
    try {
      const fileExt = file.name.split('.').pop();
      const path = `projects/${projectId}/tasks/${issue.id}/screenshot_mid_${Date.now()}.${fileExt}`;
      const url = await storageService.uploadFile(path, file);
      await taskService.updateTask(projectId, issue.id, { screenshotUrl: url });
      onIssueUpdated({ ...issue, screenshotUrl: url });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingMidTask(false);
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
    }
  };

  const updateSubtaskText = async (subtaskId, newText) => {
    if (!newText.trim()) return;
    try {
      const updatedSubtasks = (issue.subtasks || []).map(st => 
        st.id === subtaskId ? { ...st, text: newText.trim() } : st
      );
      await taskService.updateTask(projectId, issue.id, { subtasks: updatedSubtasks });
      onIssueUpdated({ ...issue, subtasks: updatedSubtasks });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSubtask = async (subtaskId) => {
    try {
      const updatedSubtasks = (issue.subtasks || []).filter(st => st.id !== subtaskId);
      await taskService.updateTask(projectId, issue.id, { subtasks: updatedSubtasks });
      onIssueUpdated({ ...issue, subtasks: updatedSubtasks });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] animate-fade-in flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="task-modal-layout relative flex shadow-2xl w-[95vw] max-w-[1100px]" style={{ maxHeight: '90vh', backgroundColor: '#000000', border: '1px solid #333333', borderRadius: '12px', padding: '0', gap: '0', color: '#FFFFFF', overflowY: 'auto', overflowX: 'hidden' }} onClick={e => e.stopPropagation()}>

        {/* ─── LEFT: main content ─────────────────────────────── */}
        <div className="flex flex-col h-full overflow-y-auto flex-1" style={{ padding: '24px 24px 0 24px', gap: '18px', scrollbarColor: '#1E293B transparent' }}>

          <div className="w-full relative group rounded-lg overflow-hidden flex items-center justify-end shrink-0" style={{ height: selectedIssue?.coverUrl ? '120px' : '28px', marginTop: '-4px' }}>
            {selectedIssue?.coverUrl ? (
              <img src={selectedIssue.coverUrl} className="w-full h-full object-cover absolute inset-0" alt="Cover" />
            ) : (
              <button className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium text-[#666666] hover:text-white hover:bg-zinc-800/50">
                Add Cover
              </button>
            )}
          </div>

          <div className="flex items-center text-[12px] font-medium shrink-0" style={{ color: '#888888' }}>
            <span className="hover:text-white cursor-pointer transition-colors">{projectDetails?.name || 'Project'}</span>
            <span className="mx-1.5 text-[#334155]">/</span>
            <span className="text-[#94A3B8] font-semibold truncate max-w-[280px]">{selectedIssue.title}</span>
          </div>

          <div className="flex items-start justify-between w-full shrink-0" style={{ gap: '12px', marginBottom: '14px' }}>
            {editingField === 'title' ? (
              <input
                autoFocus
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => { if (editValue.trim() !== selectedIssue.title) updateTaskField('title', editValue.trim()); setEditingField(null); }}
                onKeyDown={e => { if (e.key === 'Enter') { if (editValue.trim() !== selectedIssue.title) updateTaskField('title', editValue.trim()); setEditingField(null); } }}
                className="font-[700] tracking-[-0.025em] outline-none flex-1"
                style={{ fontSize: '28px', lineHeight: '1.25', backgroundColor: 'transparent', color: '#FFFFFF', border: 'none', borderBottom: '2px solid #FFFFFF', paddingBottom: '2px' }}
              />
            ) : (
              <h1
                className="font-[700] tracking-[-0.025em] text-white hover:bg-[#222222] px-1 -ml-1 rounded cursor-pointer transition-colors flex-1"
                style={{ fontSize: '28px', lineHeight: '1.25' }}
                onClick={() => { setEditingField('title'); setEditValue(selectedIssue.title || ''); }}
              >
                {selectedIssue.title}
              </h1>
            )}
            <button className="shrink-0 mt-2 p-1.5 hover:bg-[#222222] rounded transition-colors text-[#888888] hover:text-[#94A3B8]" onClick={onClose}>
              X
            </button>
          </div>

          <div className="flex flex-col shrink-0 border-b border-[#333333] pb-5" style={{ gap: '0px' }}>

            <div className="flex items-center" style={{ minHeight: '32px' }}>
              <div className="flex items-center shrink-0" style={{ width: '120px' }}>
                <span className="text-[12px] font-[500] text-[#888888]">Status</span>
              </div>
              <div className="relative flex flex-1 items-center">
                <div
                  onClick={() => setActivePopover(activePopover === 'status' ? null : 'status')}
                  className="flex items-center cursor-pointer font-[600] tracking-wider select-none hover:opacity-80 transition-opacity"
                  style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', letterSpacing: '0.06em', backgroundColor: '#000000', color: '#FFFFFF', border: '1px solid #555555' }}
                >
                  {selectedIssue.status.toUpperCase()}
                </div>
                {activePopover === 'status' && (
                  <div className="absolute left-0 z-50 flex flex-col gap-1 p-1 bg-[#111] border border-[#333] rounded-md shadow-lg" style={{ top: 'calc(100% + 8px)', minWidth: '160px' }}>
                    {['To Do', 'In Progress', 'Done'].map(s => (
                      <div key={s} onClick={() => { updateTaskField('status', s); setActivePopover(null); }} className="px-3 py-2 text-[13px] rounded cursor-pointer transition-colors hover:bg-[#222]">
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Assignee */}
            <div className="flex items-center" style={{ minHeight: '32px' }}>
              <div className="flex items-center shrink-0" style={{ width: '120px' }}>
                <span className="text-[12px] font-[500] text-[#888888]">Assignee</span>
              </div>
              <div className="relative flex flex-1 items-center">
                <div onClick={() => setActivePopover(activePopover === 'assignee' ? null : 'assignee')} className="flex items-center gap-1.5 cursor-pointer hover:bg-[#222] px-2 py-1 rounded transition-colors -ml-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: '#7C3AED' }}>
                    {selectedIssue.assignee !== 'Unassigned' ? selectedIssue.assignee.charAt(0) : '?'}
                  </div>
                  <span className="text-[13px] text-[#CCCCCC] font-[500]">{selectedIssue.assignee}</span>
                </div>
                {activePopover === 'assignee' && (
                  <div className="absolute left-0 z-50 flex flex-col gap-1 p-1 bg-[#111] border border-[#333] rounded-md shadow-lg max-h-[200px] overflow-y-auto" style={{ top: 'calc(100% + 8px)', minWidth: '180px' }}>
                    <div onClick={() => { updateTaskField('assignee', 'Unassigned'); setActivePopover(null); }} className="px-3 py-2 text-[13px] rounded cursor-pointer transition-colors text-[#94A3B8] hover:bg-[#222]">Unassigned</div>
                    {users.map(u => (
                      <div key={u.id} onClick={() => { updateTaskField('assignee', u.name); setActivePopover(null); }} className="px-3 py-2 text-[13px] rounded cursor-pointer transition-colors text-[#E5E7EB] hover:bg-[#222]">
                        {u.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Priority (Urgency) */}
            <div className="flex items-center" style={{ minHeight: '32px' }}>
              <div className="flex items-center shrink-0" style={{ width: '120px' }}>
                <span className="text-[12px] font-[500] text-[#888888]">Priority</span>
              </div>
              <div className="relative flex flex-1 items-center">
                <div onClick={() => setActivePopover(activePopover === 'urgency' ? null : 'urgency')} className="flex items-center gap-1.5 cursor-pointer hover:bg-[#222] px-2 py-1 rounded transition-colors -ml-2">
                  <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block', backgroundColor: (selectedIssue.urgency||'Medium')==='High'?'#F97316':(selectedIssue.urgency||'Medium')==='Medium'?'#EAB308':'#71717A' }}/>
                  <span className="text-[13px] text-[#CCCCCC] font-[500]">{selectedIssue.urgency || 'Medium'}</span>
                </div>
                {activePopover === 'urgency' && (
                  <div className="absolute left-0 z-50 flex flex-col gap-1 p-1 bg-[#111] border border-[#333] rounded-md shadow-lg" style={{ top: 'calc(100% + 8px)', minWidth: '160px' }}>
                    {[['High','#F97316'],['Medium','#EAB308'],['Low','#71717A']].map(([p,c])=>(
                      <div key={p} onClick={()=>{updateTaskField('urgency',p);setActivePopover(null);}} className="flex items-center gap-2 px-3 py-2 text-[13px] rounded cursor-pointer transition-colors text-[#E5E7EB] hover:bg-[#222]">
                        <span style={{width:7,height:7,borderRadius:'50%',display:'inline-block',backgroundColor:c}}/>{p}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-center" style={{ minHeight: '32px' }}>
              <div className="flex items-center shrink-0" style={{ width: '120px' }}>
                <span className="text-[12px] font-[500] text-[#888888]">Dates</span>
              </div>
              <div className="relative flex flex-1 items-center">
                <div onClick={() => setActivePopover(activePopover === 'dates' ? null : 'dates')} className="flex items-center gap-1 cursor-pointer hover:bg-[#222] px-2 py-1 rounded transition-colors -ml-2">
                  <span className="text-[13px] text-[#CCCCCC] font-[500] whitespace-nowrap">
                    {selectedIssue.startDate ? new Date(selectedIssue.startDate).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}&nbsp;→&nbsp;{selectedIssue.dueDate ? new Date(selectedIssue.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}
                  </span>
                </div>
                {activePopover === 'dates' && (
                  <div className="absolute left-0 z-50 flex flex-col gap-3 p-4 bg-[#111] border border-[#333] rounded-md shadow-lg" style={{ top: 'calc(100% + 8px)', minWidth: '220px' }}>
                    <div>
                      <label className="block text-[11px] text-[#64748B] uppercase tracking-wider mb-1.5 font-semibold">Start Date</label>
                      <input type="date" value={selectedIssue.startDate||''} onChange={e=>updateTaskField('startDate',e.target.value)} className="w-full px-2.5 py-2 bg-[#1A1D24] border border-[#2B303B] rounded text-[#E5E7EB] text-[13px] outline-none focus:border-[#4B5563]" style={{ colorScheme: 'dark' }}/>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#64748B] uppercase tracking-wider mb-1.5 font-semibold">Due Date</label>
                      <input type="date" value={selectedIssue.dueDate||''} onChange={e=>updateTaskField('dueDate',e.target.value)} className="w-full px-2.5 py-2 bg-[#1A1D24] border border-[#2B303B] rounded text-[#E5E7EB] text-[13px] outline-none focus:border-[#4B5563]" style={{ colorScheme: 'dark' }}/>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Time Estimate */}
            <div className="flex items-center" style={{ minHeight: '32px' }}>
              <div className="flex items-center shrink-0" style={{ width: '120px' }}>
                <span className="text-[12px] font-[500] text-[#888888]">Time estimate</span>
              </div>
              <div className="flex-1 flex items-center">
                {editingField === 'time' ? (
                  <input autoFocus type="text" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>{updateTaskField('timeEstimated',editValue.trim());setEditingField(null);}} onKeyDown={e=>{if(e.key==='Enter')e.target.blur();}} className="rounded px-2 text-[13px] text-[#E5E7EB] outline-none w-24 border border-indigo-500 bg-[#1E293B] h-[26px]"/>
                ) : (
                  <div onClick={()=>{setEditingField('time');setEditValue(selectedIssue.timeEstimated||'');}} className="flex items-center cursor-pointer hover:bg-[#222] px-2 py-1 rounded transition-colors text-[13px] font-[500] -ml-2">
                    {selectedIssue.timeEstimated ? <span className="text-[#CCCCCC]">{selectedIssue.timeEstimated}</span> : <span className="text-[#334155] italic">Not set</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="flex items-center" style={{ minHeight: '32px' }}>
              <div className="flex items-center shrink-0" style={{ width: '120px' }}>
                <span className="text-[12px] font-[500] text-[#888888]">Tags</span>
              </div>
              <div className="relative flex flex-1 items-center">
                <div onClick={()=>setActivePopover(activePopover==='tags'?null:'tags')} className="flex items-center gap-1 cursor-pointer hover:bg-[#222] px-2 py-1 rounded transition-colors flex-wrap -ml-2">
                  {(selectedIssue.tags||[]).length>0 ? selectedIssue.tags.map(t=>(
                    <span key={t} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#1E1B4B] text-[#A5B4FC]">{t}</span>
                  )) : <span className="text-[13px] text-[#334155] italic">Add tags</span>}
                </div>
                {activePopover==='tags'&&(
                  <div className="absolute left-0 z-50 flex flex-col gap-2 p-3 bg-[#0D1117] border border-[#1E293B] rounded-lg shadow-xl" style={{ top: 'calc(100%+6px)', width: '256px' }}>
                    <label className="text-[11px] text-[#64748B] uppercase tracking-wider block">Tags — comma separated</label>
                    <input autoFocus type="text" defaultValue={(selectedIssue.tags||[]).join(', ')} onKeyDown={e=>{if(e.key==='Enter'){const tags=e.target.value.split(',').map(t=>t.trim()).filter(Boolean);updateTaskField('tags',tags);setActivePopover(null);}}} className="w-full border rounded px-2 py-1.5 text-[13px] outline-none bg-[#1E293B] border-[#334155] text-[#E5E7EB]" placeholder="bug, ui, high-priority"/>
                    <div className="text-[11px] text-[#888] mt-0.5">↵ Enter to save</div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col shrink-0 mt-4" style={{ gap: '8px' }}>
              <h3 className="text-[11px] font-[700] uppercase tracking-widest text-[#888888]">Description</h3>
              <div className="w-full relative flex flex-col group transition-all duration-200" style={{ minHeight:'90px', backgroundColor:'#0A0A0A', borderRadius:'8px', padding:'12px 14px', border:`1px solid ${editingField==='description'?'#FFFFFF':'#333333'}` }}>
                <textarea 
                  value={editValue !== undefined && editingField === 'description' ? editValue : (selectedIssue.description || '')} 
                  onFocus={() => { setEditingField('description'); setEditValue(selectedIssue.description || ''); }}
                  onChange={e => setEditValue(e.target.value)} 
                  onBlur={() => { if(editValue !== undefined && editValue !== selectedIssue.description) updateTaskField('description', editValue); setEditingField(null); }}
                  className="w-full h-full min-h-[68px] text-[14px] leading-[1.65] outline-none border-0 bg-transparent text-white resize-none" 
                  placeholder="Click to start writing details..."
                />
              </div>
            </div>

            <div className="flex flex-col shrink-0 mt-6" style={{ gap: '8px' }}>
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] font-[700] uppercase tracking-widest text-[#888888]">Subtasks</h3>
              </div>
              <div className="flex flex-col rounded-lg overflow-hidden border border-[#263040] bg-[#0D111A]">
                {selectedIssue.subtasks && selectedIssue.subtasks.map(st => (
                  <div key={st.id} className="flex items-center justify-between px-3 py-2 hover:bg-[#222222] group transition-colors border-b border-[#333333] last:border-b-0 min-h-[36px]">
                    <div className="flex items-center gap-3 flex-1">
                      <button onClick={() => toggleSubtask(st.id)} className={`w-4 h-4 rounded border flex items-center justify-center ${st.completed ? 'bg-white border-white' : 'border-[#555]'}`}>
                        {st.completed && <span className="text-black text-[10px] font-bold">✓</span>}
                      </button>
                      <span className={`text-[13px] ${st.completed ? 'line-through text-[#555]' : 'text-[#CCC]'}`}>{st.text}</span>
                    </div>
                    <button onClick={() => deleteSubtask(st.id)} className="opacity-0 group-hover:opacity-100 text-[#888] hover:text-red-400">X</button>
                  </div>
                ))}
                <form onSubmit={addSubtask} className="px-3 py-2 bg-[#1A2236]/50">
                  <input type="text" value={newSubtaskText} onChange={e => setNewSubtaskText(e.target.value)} placeholder="Add a subtask..." className="w-full text-[13px] bg-transparent outline-none text-[#CBD5E1]" />
                </form>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="flex flex-col shrink-0" style={{ width:'290px', backgroundColor:'#060910', borderLeft:'1px solid #1A2436', overflow:'hidden' }}>
          <div className="px-4 py-3.5 border-b border-[#333333]">
            <div className="flex items-center gap-0.5 p-1 rounded-lg border border-[#333333] bg-[#0B0F18]">
              {['Activity','Notes'].map(tab => (
                 <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-colors ${activeTab === tab ? 'bg-[#333333] text-white' : 'text-[#666]'}`}>{tab}</button>
              ))}
            </div>
          </div>

          {activeTab === 'Notes' ? (
            <div className="flex flex-col flex-1 p-4">
              <textarea value={selectedIssue.notes || ''} onChange={e => updateTaskField('notes', e.target.value)} className="flex-1 w-full border border-[#333] rounded-lg p-3 text-[13px] outline-none resize-none bg-[#0B0F18] text-[#CBD5E1]" placeholder="Type internal notes..." />
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 bg-black">
                {(selectedIssue.comments || []).map(c => (
                  <div key={c.id} className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-[#222] flex items-center justify-center text-[11px] text-white shrink-0 font-semibold">{c.author.charAt(0)}</div>
                    <div className="flex-1 mt-0.5">
                      <div className="text-[13px] text-white font-semibold">{c.author}</div>
                      <div className="text-[13px] text-white px-3 py-2 mt-1 rounded-lg border border-[#333] bg-[#0A0A0A] break-words">{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-[#333] bg-black">
                <form onSubmit={addComment} className="flex flex-col rounded-lg border border-[#333] bg-[#0A0A0A] overflow-hidden">
                  <textarea value={newCommentText} onChange={e => setNewCommentText(e.target.value)} className="w-full px-3 py-3 text-[13px] bg-transparent text-white border-none resize-none min-h-[64px] outline-none" placeholder="Write a comment..." />
                  <div className="flex justify-end p-2 bg-[#111]">
                    <button type="submit" disabled={isCommenting || !newCommentText.trim()} className="px-3 py-1 text-[12px] bg-white text-black rounded font-medium disabled:opacity-50">Post</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default TaskDetailModal;
