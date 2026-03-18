import sys
import re

file_path = r'c:\Users\user\Desktop\Anti gravity\Skillhub\src\pages\Discussions.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('{selectedIssue && (')
if start_idx != -1:
    end_idx = content.find('  );\n};', start_idx)
    if end_idx != -1:
        new_content = content[:start_idx] + '''{selectedIssue && (
        <div className="fixed inset-0 z-[100] flex animate-fade-in" style={{ backgroundColor: '#131313', color: '#E4E4E7' }}>
          
          {/* Main Left Content Area */}
          <div className="flex-1 flex flex-col h-full overflow-y-auto" style={{ scrollbarColor: '#333 transparent' }}>
            
            {/* Header / Breadcrumb */}
            <div className="px-10 py-5 flex items-center justify-between sticky top-0 bg-[#131313] z-10 border-b border-[#27272A]">
              <div className="flex items-center gap-3 text-sm text-[#A1A1AA]">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  <span>Task</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  <span className="text-[#E4E4E7]">SkillHub web-site</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#A1A1AA]">
                <button className="flex items-center gap-1 hover:text-[#E4E4E7] transition-colors">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
                  Active
                </button>
                <button onClick={() => setSelectedIssue(null)} className="ml-4 hover:text-white transition-colors p-1 rounded-md hover:bg-[#27272A]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="px-10 py-8 max-w-[900px]">
              
              {/* Title */}
              <h1 className="text-[32px] sm:text-[40px] font-bold tracking-tight mb-8 leading-[1.2] text-white">
                {selectedIssue.title}
              </h1>

              {/* AI Banner Placeholder */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#1C1C1F] border border-[#27272A] rounded-md mb-8 text-sm text-[#A1A1AA]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2"><path d="M12 2l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z"/></svg>
                <span>Ask Brain to create a summary, generate an update or find similar tasks</span>
              </div>

              {/* Properties Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4 mb-12">
                {/* Status */}
                <div className="flex items-center gap-4 group">
                  <div className="w-[140px] flex items-center gap-2 text-[#A1A1AA] text-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    Status
                  </div>
                  <div className="flex items-center gap-2 bg-[#064E3B] text-[#34D399] px-2 py-0.5 rounded text-xs font-bold tracking-wide uppercase border border-[#047857]">
                    {selectedIssue.status}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </div>
                </div>

                {/* Assignees */}
                <div className="flex items-center gap-4 group">
                  <div className="w-[140px] flex items-center gap-2 text-[#A1A1AA] text-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Assignees
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#E4E4E7]">
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white', fontWeight: 'bold' }}>
                      {selectedIssue.assignee !== 'Unassigned' ? selectedIssue.assignee.charAt(0) : '?'}
                    </div>
                    {selectedIssue.assignee}
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-4 group">
                  <div className="w-[140px] flex items-center gap-2 text-[#A1A1AA] text-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Dates
                  </div>
                  <div className="text-[#A1A1AA] text-sm flex items-center gap-2">
                    Start <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg> Due
                  </div>
                </div>

                {/* Priority */}
                <div className="flex items-center gap-4 group">
                  <div className="w-[140px] flex items-center gap-2 text-[#A1A1AA] text-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                    Priority
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#E4E4E7]">
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: selectedIssue.urgency === 'High' ? '#EF4444' : selectedIssue.urgency === 'Medium' ? '#3B82F6' : '#22C55E' }}></span>
                    {selectedIssue.urgency === 'High' ? 'High' : selectedIssue.urgency === 'Medium' ? 'Normal' : 'Low'}
                  </div>
                </div>

                {/* Time estimate */}
                <div className="flex items-center gap-4 group">
                  <div className="w-[140px] flex items-center gap-2 text-[#A1A1AA] text-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12l-9-9-9 9"/><path d="M12 12l9 9"/><path d="M3 12l9 9"/></svg>
                    Time estimate
                  </div>
                  <div className="text-[#A1A1AA] text-sm">Empty</div>
                </div>

                {/* Sprint points */}
                <div className="flex items-center gap-4 group">
                  <div className="w-[140px] flex items-center gap-2 text-[#A1A1AA] text-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
                    Sprint points
                  </div>
                  <div className="text-[#E4E4E7] text-sm">5</div>
                </div>
              </div>

              {/* Rich Text Description */}
              {selectedIssue.description && (
                <div className="mb-14">
                  <p className="text-[15px] leading-[1.6] text-[#E4E4E7] whitespace-pre-wrap font-sans">
                    {selectedIssue.description}
                  </p>
                </div>
              )}

              {/* Subtasks block */}
              <div className="mb-14 border border-[#27272A] rounded-lg overflow-hidden bg-[#18181B]">
                <div className="flex items-center justify-between px-4 py-3 bg-[#131313] border-b border-[#27272A]">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <span className="text-sm font-semibold text-[#E4E4E7]">Subtasks</span>
                    <span className="text-[#A1A1AA] text-xs font-mono">{selectedIssue.subtasks?.length || 0} open</span>
                  </div>
                  <div className="flex gap-2">
                     <button className="text-[#A1A1AA] hover:text-white px-2 py-1 flex items-center gap-1 text-xs"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg> Suggest</button>
                     <button className="text-[#A1A1AA] hover:text-white px-2 py-1 flex items-center gap-1 text-xs border-l border-[#27272A]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg></button>
                  </div>
                </div>

                <div className="flex-col divide-y divide-[#27272A]">
                  {selectedIssue.subtasks && selectedIssue.subtasks.map((st, i) => (
                    <div key={st.id} className="flex items-center justify-between px-4 py-2 hover:bg-[#202024] group cursor-pointer" onClick={() => toggleSubtask(st.id)}>
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${st.completed ? 'bg-[#34D399] border-[#34D399]' : 'border-[#52525B]'}`}>
                           {st.completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        <span className={`text-[13px] ${st.completed ? 'line-through text-[#71717A]' : 'text-[#D4D4D8]'}`}>
                          {i + 1}. {st.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => { e.stopPropagation(); deleteSubtask(st.id); }} className="text-[#A1A1AA] hover:text-[#EF4444]"><Trash2 size="14"/></button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add subtask input */}
                  <div className="flex items-center px-4 py-2 hover:bg-[#202024]">
                    <div className="w-4 h-4 rounded-full border border border-[#52525B] border-dashed mr-3"></div>
                    <form onSubmit={addSubtask} className="flex-1">
                      <input 
                        type="text" 
                        value={newSubtaskText} 
                        onChange={(e) => setNewSubtaskText(e.target.value)} 
                        placeholder="Add subtask..." 
                        className="w-full text-[13px] bg-transparent outline-none text-[#D4D4D8] placeholder-[#71717A]" 
                      />
                    </form>
                  </div>
                </div>
              </div>

               {/* Screenshot Upload Feature integrated into Dark theme */}
              <div className="mb-14 border border-[#27272A] rounded-lg overflow-hidden bg-[#18181B]">
                <div className="flex items-center px-4 py-3 bg-[#131313] border-b border-[#27272A]">
                  <span className="text-sm font-semibold text-[#E4E4E7]">Proof / Attachment</span>
                </div>
                <div className="p-4 flex flex-col items-center">
                  {selectedIssue.screenshotUrl && (
                    <img src={selectedIssue.screenshotUrl} alt="Task Proof" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px', marginBottom: '1rem', border: '1px solid #27272A' }}/>
                  )}
                  <label className="bg-[#27272A] hover:bg-[#3F3F46] text-[#E4E4E7] text-xs px-4 py-2 rounded-md cursor-pointer transition-colors flex items-center gap-2 mt-4 inline-flex w-max mx-auto border border-[#3F3F46]">
                    {isUploadingMidTask ? <Loader2 size="14" className="animate-spin" /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
                    {selectedIssue.screenshotUrl ? 'Update Screenshot' : 'Upload Screenshot'}
                    <input type="file" accept="image/*" className="hidden" onChange={uploadMidTaskScreenshot} disabled={isUploadingMidTask} />
                  </label>
                </div>
              </div>

            </div>
          </div>

          {/* Right Sidebar (Comments & Activity) */}
          <div className="w-[360px] h-full bg-[#18181B] border-l border-[#27272A] flex flex-col flex-shrink-0 relative hidden lg:flex">
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-[#27272A] bg-[#18181B]">
              <span className="text-[13px] font-semibold text-[#E4E4E7]">Activity</span>
              <div className="flex items-center gap-2 text-[#A1A1AA]">
                <button className="hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>
                <button className="hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg></button>
              </div>
            </div>

            {/* Comments Stream */}
            <div className="flex-1 overflow-y-auto p-5 pb-24 flex flex-col gap-6" style={{ scrollbarColor: '#333 transparent' }}>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-[#A1A1AA] flex items-center justify-center text-[10px] text-white flex-shrink-0">
                  {selectedIssue.author.charAt(0)}
                </div>
                <div className="flex-col">
                   <div className="text-[12px] text-[#A1A1AA] mb-0.5"><span className="text-[#E4E4E7] font-medium">{selectedIssue.author}</span> created this task</div>
                   <div className="text-[10px] text-[#52525B]">At creation</div>
                </div>
              </div>

              {selectedIssue.comments && selectedIssue.comments.map(c => (
                <div key={c.id} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-[#6366F1] flex items-center justify-center text-[10px] text-white flex-shrink-0 font-bold">
                    {c.author.charAt(0)}
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium text-[#E4E4E7]">{c.author}</span>
                      <span className="text-[10px] text-[#71717A]">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-[13px] text-[#D4D4D8] bg-[#202024] p-3 rounded-lg border border-[#27272A] whitespace-pre-wrap leading-[1.5]">
                      {c.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment Input docked at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#18181B] border-t border-[#27272A]">
               <form onSubmit={addComment} className="relative">
                 <textarea 
                   value={newCommentText}
                   onChange={e => setNewCommentText(e.target.value)}
                   className="w-full bg-[#131313] border border-[#27272A] rounded-lg p-3 text-[13px] text-[#E4E4E7] outline-none placeholder-[#71717A] resize-none"
                   rows="2"
                   placeholder="Mention @Brain to create, find, ask anything"
                 />
                 <div className="flex justify-between items-center mt-2 px-1">
                    <div className="flex items-center gap-2 text-[#71717A]">
                       <button type="button" className="hover:text-[#E4E4E7]"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg></button>
                       <span className="text-[11px] font-medium ml-1 flex items-center gap-1">Comment <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></span>
                    </div>
                    <button type="submit" disabled={isCommenting} className={`flex items-center justify-center p-1.5 rounded transition-colors ${newCommentText.trim() ? 'text-[#34D399] hover:bg-[#064E3B]' : 'text-[#52525B]'}`}>
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                 </div>
               </form>
            </div>
          </div>
        </div>
      )}''' + content[end_idx:]

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('Successfully replaced using python logic')
    else:
        print('Error: Could not find end of file block')
else:
    print('Error: Could not find start of block')
