"""
Patch script: replaces the task dialog section (lines 606-1187) of Discussions.jsx
with a fully fixed, polished version. Run from any directory.
"""
import re

FILE = r"c:\Users\user\Desktop\Anti gravity\Skillhub\src\pages\Discussions.jsx"

with open(FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

# The dialog section starts at line 606 (index 605) and ends at line 1187 (index 1186).
START = 605   # 0-indexed, inclusive
END   = 1187  # 0-indexed, exclusive (line 1188 stays)

NEW_BLOCK = """\
      {selectedIssue && (
        <div className="fixed inset-0 z-[100] animate-fade-in flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }} onClick={() => setSelectedIssue(null)}>
          <div className="relative flex shadow-2xl w-[95vw] max-w-[1100px]" style={{ height: '80vh', maxHeight: '820px', minHeight: '650px', backgroundColor: '#0D1117', border: '1px solid #1E293B', borderRadius: '12px', padding: '0', gap: '0', color: '#E5E7EB', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

            {/* ─── LEFT: main content ─────────────────────────────── */}
            <div className="flex flex-col h-full overflow-y-auto flex-1" style={{ padding: '24px 24px 0 24px', gap: '18px', scrollbarColor: '#1E293B transparent' }}>

              {/* Cover banner */}
              <div className="w-full relative group rounded-lg overflow-hidden flex items-center justify-end shrink-0" style={{ height: selectedIssue?.coverUrl ? '120px' : '28px', marginTop: '-4px' }}>
                {selectedIssue?.coverUrl ? (
                  <img src={selectedIssue.coverUrl} className="w-full h-full object-cover absolute inset-0" alt="Cover" />
                ) : (
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    Add Cover
                  </button>
                )}
              </div>

              {/* FIX #4 — Breadcrumb uses only real data */}
              <div className="flex items-center text-[12px] font-medium shrink-0" style={{ color: '#475569' }}>
                <span className="hover:text-zinc-300 cursor-pointer transition-colors">{projectDetails?.name || 'Project'}</span>
                <span className="mx-1.5 text-[#334155]">/</span>
                <span className="text-[#94A3B8] font-semibold truncate max-w-[280px]">{selectedIssue.title}</span>
              </div>

              {/* Title row */}
              <div className="flex items-start justify-between w-full shrink-0" style={{ gap: '12px' }}>
                {editingField === 'title' ? (
                  <input
                    autoFocus
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => { if (editValue.trim() !== selectedIssue.title) updateTaskField('title', editValue.trim()); setEditingField(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { if (editValue.trim() !== selectedIssue.title) updateTaskField('title', editValue.trim()); setEditingField(null); } }}
                    className="font-[600] tracking-[-0.02em] outline-none flex-1"
                    style={{ fontSize: '24px', lineHeight: '32px', backgroundColor: 'transparent', color: '#E5E7EB', border: 'none', borderBottom: '1px solid #6366f1', paddingBottom: '2px' }}
                  />
                ) : (
                  <h1
                    className="font-[600] tracking-[-0.02em] text-[#E2E8F0] hover:bg-[#0F172A] px-1 -ml-1 rounded cursor-pointer transition-colors flex-1"
                    style={{ fontSize: '24px', lineHeight: '32px' }}
                    onClick={() => { setEditingField('title'); setEditValue(selectedIssue.title || ''); }}
                  >
                    {selectedIssue.title}
                  </h1>
                )}
                <button className="shrink-0 mt-1 p-1.5 hover:bg-[#1E293B] rounded transition-colors text-[#475569] hover:text-[#CBD5E1]" onClick={e => { e.stopPropagation(); setSelectedIssue(null); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* ── FIX #5 / #6 — Metadata: proper 2-col label → value layout ── */}
              <div className="flex flex-col shrink-0 border-b border-[#1E293B] pb-5" style={{ gap: '2px' }}>

                {/* Status */}
                <div className="flex items-center" style={{ minHeight: '30px' }}>
                  <div className="flex items-center gap-1.5 shrink-0 text-[#475569]" style={{ width: '116px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
                    <span className="text-[12px] font-[500]">Status</span>
                  </div>
                  <div className="relative">
                    <div
                      onClick={() => setActivePopover(activePopover === 'status' ? null : 'status')}
                      className="flex items-center cursor-pointer font-[600] tracking-wide select-none hover:opacity-75 transition-opacity"
                      style={{
                        padding: '2px 9px', borderRadius: '4px', fontSize: '11px',
                        backgroundColor: selectedIssue.status === 'Done' ? '#14532D' : selectedIssue.status === 'In Progress' ? '#1E3A5F' : '#1C1C1E',
                        color: selectedIssue.status === 'Done' ? '#4ADE80' : selectedIssue.status === 'In Progress' ? '#60A5FA' : '#71717A',
                        border: `1px solid ${selectedIssue.status === 'Done' ? '#166534' : selectedIssue.status === 'In Progress' ? '#1D4ED8' : '#3F3F46'}`
                      }}
                    >
                      {selectedIssue.status.toUpperCase()}
                    </div>
                    {activePopover === 'status' && (
                      <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-44 rounded-lg shadow-xl py-1 overflow-hidden" style={{ backgroundColor: '#0D1117', border: '1px solid #1E293B' }}>
                        {[['To Do','#71717A'],['In Progress','#60A5FA'],['Done','#4ADE80']].map(([s,c]) => (
                          <div key={s} onClick={() => { updateTaskField('status', s); setActivePopover(null); }} className="px-3 py-2 text-[13px] text-[#D1D5DB] hover:bg-[#1E293B] cursor-pointer flex items-center gap-2">
                            <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block', backgroundColor: c }}/>
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignee */}
                <div className="flex items-center" style={{ minHeight: '30px' }}>
                  <div className="flex items-center gap-1.5 shrink-0 text-[#475569]" style={{ width: '116px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span className="text-[12px] font-[500]">Assignee</span>
                  </div>
                  <div className="relative">
                    <div onClick={() => setActivePopover(activePopover === 'assignee' ? null : 'assignee')} className="flex items-center gap-1.5 cursor-pointer hover:bg-[#1E293B]/60 px-2 py-1 rounded transition-colors -ml-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: '#7C3AED' }}>
                        {selectedIssue.assignee !== 'Unassigned' ? selectedIssue.assignee.charAt(0) : '?'}
                      </div>
                      <span className="text-[13px] text-[#CBD5E1] font-[500]">{selectedIssue.assignee}</span>
                    </div>
                    {activePopover === 'assignee' && (
                      <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-56 rounded-lg shadow-xl py-1 max-h-48 overflow-y-auto" style={{ backgroundColor: '#0D1117', border: '1px solid #1E293B' }}>
                        <div onClick={() => { updateTaskField('assignee', 'Unassigned'); setActivePopover(null); }} className="px-3 py-2 text-[13px] text-[#94A3B8] hover:bg-[#1E293B] cursor-pointer">Unassigned</div>
                        {users.map(u => (<div key={u.id} onClick={() => { updateTaskField('assignee', u.name); setActivePopover(null); }} className="px-3 py-2 text-[13px] text-[#E5E7EB] hover:bg-[#1E293B] cursor-pointer">{u.name}</div>))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Priority */}
                <div className="flex items-center" style={{ minHeight: '30px' }}>
                  <div className="flex items-center gap-1.5 shrink-0 text-[#475569]" style={{ width: '116px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/></svg>
                    <span className="text-[12px] font-[500]">Priority</span>
                  </div>
                  <div className="relative">
                    <div onClick={() => setActivePopover(activePopover === 'priority' ? null : 'priority')} className="flex items-center gap-1.5 cursor-pointer hover:bg-[#1E293B]/60 px-2 py-1 rounded transition-colors -ml-2">
                      <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block', backgroundColor: (selectedIssue.priority||'Medium')==='Urgent'?'#EF4444':(selectedIssue.priority||'Medium')==='High'?'#F97316':(selectedIssue.priority||'Medium')==='Medium'?'#EAB308':'#71717A' }}/>
                      <span className="text-[13px] text-[#CBD5E1] font-[500]">{selectedIssue.priority || 'Medium'}</span>
                    </div>
                    {activePopover === 'priority' && (
                      <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-36 rounded-lg shadow-xl py-1" style={{ backgroundColor: '#0D1117', border: '1px solid #1E293B' }}>
                        {[['Urgent','#EF4444'],['High','#F97316'],['Medium','#EAB308'],['Low','#71717A']].map(([p,c])=>(
                          <div key={p} onClick={()=>{updateTaskField('priority',p);setActivePopover(null);}} className="px-3 py-2 text-[13px] text-[#E5E7EB] hover:bg-[#1E293B] cursor-pointer flex items-center gap-2">
                            <span style={{width:7,height:7,borderRadius:'50%',display:'inline-block',backgroundColor:c}}/>{p}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-center" style={{ minHeight: '30px' }}>
                  <div className="flex items-center gap-1.5 shrink-0 text-[#475569]" style={{ width: '116px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span className="text-[12px] font-[500]">Dates</span>
                  </div>
                  <div className="relative">
                    <div onClick={() => setActivePopover(activePopover === 'dates' ? null : 'dates')} className="flex items-center gap-1 cursor-pointer hover:bg-[#1E293B]/60 px-2 py-1 rounded transition-colors -ml-2">
                      <span className="text-[13px] text-[#CBD5E1] font-[500] whitespace-nowrap">
                        {selectedIssue.startDate ? new Date(selectedIssue.startDate).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}&nbsp;→&nbsp;{selectedIssue.dueDate ? new Date(selectedIssue.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}
                      </span>
                    </div>
                    {activePopover === 'dates' && (
                      <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-60 rounded-lg shadow-xl p-3 flex flex-col gap-3" style={{ backgroundColor: '#0D1117', border: '1px solid #1E293B' }}>
                        <div><label className="text-[11px] text-[#64748B] uppercase tracking-wider mb-1 block">Start Date</label><input type="date" value={selectedIssue.startDate||''} onChange={e=>updateTaskField('startDate',e.target.value)} className="w-full border rounded px-2 py-1.5 text-[13px] outline-none" style={{backgroundColor:'#1E293B',borderColor:'#334155',color:'#E5E7EB',colorScheme:'dark'}}/></div>
                        <div><label className="text-[11px] text-[#64748B] uppercase tracking-wider mb-1 block">Due Date</label><input type="date" value={selectedIssue.dueDate||''} onChange={e=>updateTaskField('dueDate',e.target.value)} className="w-full border rounded px-2 py-1.5 text-[13px] outline-none" style={{backgroundColor:'#1E293B',borderColor:'#334155',color:'#E5E7EB',colorScheme:'dark'}}/></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Time estimate */}
                <div className="flex items-center" style={{ minHeight: '30px' }}>
                  <div className="flex items-center gap-1.5 shrink-0 text-[#475569]" style={{ width: '116px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span className="text-[12px] font-[500]">Time estimate</span>
                  </div>
                  <div>
                    {editingField === 'time' ? (
                      <input autoFocus type="text" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>{updateTaskField('timeEstimated',editValue.trim());setEditingField(null);}} onKeyDown={e=>{if(e.key==='Enter')e.target.blur();}} className="rounded px-2 text-[13px] text-[#E5E7EB] outline-none w-24 border border-indigo-500" style={{backgroundColor:'#1E293B',height:'26px'}}/>
                    ) : (
                      <div onClick={()=>{setEditingField('time');setEditValue(selectedIssue.timeEstimated||'');}} className="flex items-center cursor-pointer hover:bg-[#1E293B]/60 px-2 py-1 rounded transition-colors text-[13px] font-[500] -ml-2">
                        {selectedIssue.timeEstimated ? <span className="text-[#CBD5E1]">{selectedIssue.timeEstimated}</span> : <span className="text-[#334155] italic">Not set</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-center" style={{ minHeight: '30px' }}>
                  <div className="flex items-center gap-1.5 shrink-0 text-[#475569]" style={{ width: '116px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    <span className="text-[12px] font-[500]">Tags</span>
                  </div>
                  <div className="relative">
                    <div onClick={()=>setActivePopover(activePopover==='tags'?null:'tags')} className="flex items-center gap-1 cursor-pointer hover:bg-[#1E293B]/60 px-2 py-1 rounded transition-colors flex-wrap -ml-2">
                      {(selectedIssue.tags||[]).length>0 ? selectedIssue.tags.map(t=>(
                        <span key={t} className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{backgroundColor:'#1E1B4B',color:'#A5B4FC'}}>{t}</span>
                      )) : <span className="text-[13px] text-[#334155] italic">Add tags</span>}
                    </div>
                    {activePopover==='tags'&&(
                      <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-64 rounded-lg shadow-xl p-3" style={{backgroundColor:'#0D1117',border:'1px solid #1E293B'}}>
                        <label className="text-[11px] text-[#64748B] uppercase tracking-wider mb-2 block">Tags — comma separated</label>
                        <input autoFocus type="text" defaultValue={(selectedIssue.tags||[]).join(', ')} onKeyDown={e=>{if(e.key==='Enter'){const tags=e.target.value.split(',').map(t=>t.trim()).filter(Boolean);updateTaskField('tags',tags);setActivePopover(null);}}} className="w-full border rounded px-2 py-1.5 text-[13px] outline-none" style={{backgroundColor:'#1E293B',borderColor:'#334155',color:'#E5E7EB'}} placeholder="bug, ui, high-priority"/>
                        <div className="text-[11px] text-[#475569] mt-1.5">↵ Enter to save</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* FIX #11 — AI banner below metadata */}
                <div className="w-fit flex items-center gap-2 cursor-pointer mt-4" style={{backgroundColor:'#6366F10D',padding:'5px 10px',borderRadius:'6px',border:'1px solid #6366F120'}}>
                  <span className="text-[13px]">✨</span>
                  <span className="text-[12px] font-medium text-[#818CF8]">Ask Brain to summarize, generate subtasks or find similar milestones</span>
                </div>

              </div>

              {/* FIX #12 — Description */}
              <div className="flex flex-col shrink-0" style={{ gap: '6px' }}>
                <h3 className="text-[11px] font-[700] uppercase tracking-widest text-[#475569]">Description</h3>
                <div className="w-full relative group" style={{minHeight:'90px',backgroundColor:'#0B0F17',borderRadius:'8px',padding:'10px 12px',border:'1px solid #1E293B'}}>
                  {editingField==='description' ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1 pb-2 border-b border-zinc-800 text-zinc-500">
                        <button className="p-1 hover:bg-zinc-800 rounded hover:text-white transition-colors"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg></button>
                        <button className="p-1 hover:bg-zinc-800 rounded hover:text-white transition-colors"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg></button>
                        <div className="w-[1px] h-3.5 bg-zinc-800 mx-0.5"/>
                        <button className="p-1 hover:bg-zinc-800 rounded hover:text-white transition-colors"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></button>
                        <button className="p-1 hover:bg-zinc-800 rounded hover:text-white transition-colors"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
                      </div>
                      <textarea autoFocus value={editValue} onChange={e=>setEditValue(e.target.value)} className="w-full min-h-[72px] text-[14px] leading-[1.65] outline-none resize-y" style={{backgroundColor:'transparent',color:'#e4e4e7',border:'none',padding:0}} placeholder="Add task details here..."/>
                      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                        <button className="px-3 py-1 text-[12px] font-medium text-zinc-400 hover:text-white transition-colors" onClick={()=>setEditingField(null)}>Cancel</button>
                        <button className="px-3 py-1 text-[12px] font-medium bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors" onClick={()=>{if(editValue!==selectedIssue.description)updateTaskField('description',editValue);setEditingField(null);}}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="cursor-pointer min-h-[68px]" onClick={()=>{setEditingField('description');setEditValue(selectedIssue.description||'');}}>
                      {selectedIssue.description ? (
                        <p className="text-[14px] leading-[1.65] text-zinc-300 whitespace-pre-wrap">{selectedIssue.description}</p>
                      ) : (
                        <p className="text-[14px] text-zinc-600 italic">No description — click to add details.</p>
                      )}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800/80 rounded p-1 text-zinc-400">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* FIX #2/#3 — Merged Subtasks (removed fake "Subtasks 0" + duplicate Checklist) */}
              <div className="flex flex-col shrink-0" style={{ gap: '6px' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-[700] uppercase tracking-widest text-[#475569] flex items-center gap-2">
                    Subtasks
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{backgroundColor:'#1E293B',color:'#64748B'}}>
                      {selectedIssue.subtasks?.filter(st=>st.completed).length||0}/{selectedIssue.subtasks?.length||0}
                    </span>
                  </h3>
                </div>
                <div className="flex flex-col rounded-lg overflow-hidden" style={{backgroundColor:'#0B0F17',border:'1px solid #1E293B'}}>
                  {selectedIssue.subtasks && selectedIssue.subtasks.map(st => (
                    <div key={st.id} className="flex items-center justify-between px-3 py-2 hover:bg-zinc-800/30 group transition-colors border-b border-[#1E293B] last:border-b-0">
                      <div className="flex items-center gap-2.5 flex-1">
                        {/* FIX #9 — compact 20px checkbox toggle (no wide pill) */}
                        <button
                          onClick={()=>toggleSubtask(st.id)}
                          className="shrink-0 flex items-center justify-center rounded transition-all duration-150"
                          style={{width:18,height:18,borderRadius:'4px',backgroundColor:st.completed?'#10B981':'transparent',border:`1.5px solid ${st.completed?'#10B981':'#374151'}`}}
                        >
                          {st.completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </button>
                        {editingField===`subtask-${st.id}` ? (
                          <input autoFocus type="text" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>{if(editValue.trim()!==st.text)updateSubtaskText(st.id,editValue);setEditingField(null);}} onKeyDown={e=>{if(e.key==='Enter')e.target.blur();}} className="outline-none flex-1 text-[13px]" style={{backgroundColor:'transparent',color:'#fff',border:'none',borderBottom:'1px solid #6366f1'}}/>
                        ) : (
                          <span onClick={()=>{setEditingField(`subtask-${st.id}`);setEditValue(st.text);}} className={`flex-1 text-[13px] cursor-text select-none ${st.completed?'line-through text-zinc-600':'text-zinc-200 hover:text-white'}`}>{st.text}</span>
                        )}
                      </div>
                      <button onClick={e=>{e.stopPropagation();deleteSubtask(st.id);}} className="w-6 h-6 opacity-0 group-hover:opacity-100 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-all ml-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                      </button>
                    </div>
                  ))}
                  {/* FIX #10 — Enter hint visible when typing */}
                  <div className="flex items-center px-3 py-2.5 hover:bg-zinc-800/20 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" className="mr-2.5 shrink-0"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <form onSubmit={addSubtask} className="flex-1 flex items-center gap-2">
                      <input type="text" value={newSubtaskText} onChange={e=>setNewSubtaskText(e.target.value)} placeholder="Add a subtask..." className="flex-1 text-[13px] outline-none placeholder-zinc-700 font-medium" style={{backgroundColor:'transparent',color:'#D4D4D8',border:'none'}}/>
                      {newSubtaskText.trim() && <span className="text-[11px] text-zinc-600 shrink-0">↵ add</span>}
                    </form>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div className="flex flex-col shrink-0 pb-6" style={{ gap: '6px' }}>
                <h3 className="text-[11px] font-[700] uppercase tracking-widest text-[#475569]">Attachments</h3>
                {selectedIssue.screenshotUrl ? (
                  <div className="relative group rounded-lg overflow-hidden border border-zinc-800 bg-[#0B0F17]">
                    <img src={selectedIssue.screenshotUrl} alt="Task Proof" className="w-full h-auto max-h-[320px] object-contain"/>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[13px] font-medium px-4 py-2 rounded cursor-pointer transition-colors flex items-center gap-2 border border-zinc-700">
                        {isUploadingMidTask?<Loader2 size="14" className="animate-spin"/>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
                        Update Screenshot
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={uploadMidTaskScreenshot} disabled={isUploadingMidTask}/>
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#1E293B] hover:border-zinc-600 hover:bg-zinc-800/20 transition-all w-full rounded-lg flex flex-col items-center justify-center cursor-pointer" style={{height:'88px'}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" className="mb-1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span className="text-[13px] font-medium text-zinc-500">Upload Screenshot</span>
                    <span className="text-[11px] text-zinc-700 mt-0.5">PNG, JPG, GIF</span>
                    <input type="file" accept="image/*" style={{display:'none'}} onChange={uploadMidTaskScreenshot} disabled={isUploadingMidTask}/>
                  </label>
                )}
              </div>

            </div> {/* end left */}

            {/* ─── FIX #8 — RIGHT SIDEBAR: unified border/bg ── */}
            <div className="flex flex-col shrink-0" style={{width:'290px',backgroundColor:'#080C12',borderLeft:'1px solid #1E293B',overflow:'hidden'}}>

              {/* Tabs */}
              <div className="p-3 border-b border-[#1E293B]">
                <div className="flex items-center gap-0.5 p-1 bg-[#0D1117] rounded-lg border border-[#1E293B]">
                  {['Activity','Comments','Notes'].map(tab=>(
                    <button key={tab} onClick={()=>setActiveTab(tab)} className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-colors ${activeTab===tab?'bg-[#1E293B] text-white shadow-sm':'text-zinc-600 hover:text-zinc-300'}`}>{tab}</button>
                  ))}
                </div>
              </div>

              {activeTab==='Notes' ? (
                <div className="flex flex-col flex-1 gap-2 p-3 overflow-hidden">
                  <p className="text-[11px] text-[#475569]">Internal notes — not visible to the client.</p>
                  <textarea value={selectedIssue.notes||''} onChange={e=>updateTaskField('notes',e.target.value)} placeholder="Type internal notes... (auto-saves)" className="flex-1 w-full border border-[#1E293B] rounded-lg p-2.5 text-[13px] outline-none resize-none placeholder-zinc-700 focus:border-indigo-500/40 transition-colors" style={{backgroundColor:'#0D1117',color:'#E4E4E7'}}/>
                </div>
              ) : (
                <div className="flex flex-col flex-1 overflow-hidden">
                  {/* Feed */}
                  <div className="flex-1 overflow-y-auto flex flex-col gap-3.5 p-3" style={{scrollbarColor:'#1E293B transparent'}}>

                    {/* Creation */}
                    <div className="flex gap-2.5 items-start">
                      <div className="w-7 h-7 rounded-full bg-[#1E293B] flex items-center justify-center text-[11px] text-white shrink-0 font-bold">{selectedIssue.author.charAt(0)}</div>
                      <div>
                        <div className="text-[12px] text-zinc-300"><span className="font-semibold text-white">{selectedIssue.author}</span> created this task</div>
                        <div className="text-[11px] text-[#334155] mt-0.5">{new Date(selectedIssue.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                      </div>
                    </div>

                    {(selectedIssue.comments||[]).map(c=>(
                      <div key={c.id} className="flex gap-2.5 items-start">
                        <div className="w-7 h-7 rounded-full bg-[#1E293B] flex items-center justify-center text-[11px] text-white shrink-0 font-bold">{c.author.charAt(0)}</div>
                        <div className="flex-1">
                          <div className="text-[12px] text-zinc-300"><span className="font-semibold text-white">{c.author}</span></div>
                          <div className="text-[11px] text-[#334155] mt-0.5 mb-1">{new Date(c.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                          <div className="text-[12px] text-zinc-200 px-2.5 py-2 rounded-lg border border-[#1E293B] bg-[#0D1117] whitespace-pre-wrap leading-[1.55]">{c.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* FIX #7 — Comment box: taller, auto-grow, send hint */}
                  <div className="p-3 border-t border-[#1E293B]">
                    <form onSubmit={addComment} className="flex flex-col rounded-lg border border-[#1E293B] bg-[#0D1117] overflow-hidden focus-within:border-zinc-600 transition-colors">
                      <textarea
                        value={newCommentText}
                        onChange={e=>setNewCommentText(e.target.value)}
                        className="w-full px-3 pt-2.5 pb-1 text-[13px] outline-none resize-none font-sans"
                        style={{backgroundColor:'transparent',color:'#fff',border:'none',minHeight:'60px'}}
                        placeholder="Write a comment..."
                        onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(newCommentText.trim()&&!isCommenting)addComment(e);}}}
                      />
                      <div className="flex items-center justify-between px-2 pb-2 pt-1">
                        <span className="text-[10px] text-zinc-700">Shift+↵ new line</span>
                        <button type="submit" disabled={isCommenting||!newCommentText.trim()} className={`p-1.5 rounded transition-colors ${newCommentText.trim()?'bg-indigo-600 text-white hover:bg-indigo-500':'text-zinc-700 cursor-not-allowed'}`}>
                          {isCommenting?<Loader2 size="14" className="animate-spin"/>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
"""

new_lines = lines[:START] + [NEW_BLOCK] + lines[END:]

with open(FILE, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print(f"✅ Done. File saved: {FILE}")
print(f"   Replaced lines {START+1}–{END} with {len(NEW_BLOCK.splitlines())} lines of fixed dialog.")
