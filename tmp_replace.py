import re
import sys

def apply_polish():
    with open('src/pages/Discussions.jsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Title refinement
    # Add MB-14px to title container
    content = content.replace(
        '''<div className="flex items-start justify-between w-full shrink-0" style={{ gap: '12px' }}>''',
        '''<div className="flex items-start justify-between w-full shrink-0" style={{ gap: '12px', marginBottom: '14px' }}>'''
    )
    # Reduce line-height
    content = content.replace("lineHeight: '36px'", "lineHeight: '1.25'")
    # Title close button align
    content = content.replace(
        '''<button className="shrink-0 mt-1.5 p-1.5 hover:bg-[#1E293B] rounded transition-colors text-[#3D4F63] hover:text-[#94A3B8]" onClick={e => { e.stopPropagation(); setSelectedIssue(null); }}>''',
        '''<button className="shrink-0 mt-2 p-1.5 hover:bg-[#1E293B] rounded transition-colors text-[#3D4F63] hover:text-[#94A3B8]" onClick={e => { e.stopPropagation(); setSelectedIssue(null); }}>'''
    )
    content = content.replace(
        '''<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>''',
        '''<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'''
    )

    # 2. Metadata alignment system + 8. Icon alignment
    # Convert left section to 2-column layout. Make labels fixed width 120px and values flexible.
    # We change `<div className="flex items-center gap-2 shrink-0" style={{ width: '116px' }}>`
    # to `<div className="flex items-center gap-2.5 shrink-0" style={{ width: '124px' }}>`
    # and wrap SVG in `<div className="w-[18px] flex justify-center shrink-0">`
    content = re.sub(
        r'<div className="flex items-center gap-2 shrink-0" style={{ width: \'116px\' }}>\s*<svg (.*?)</svg>\s*<span className="text-\[12px\] font-\[500\] text-\[#3D4F63\]">(.*?)</span>\s*</div>',
        r'<div className="flex items-center shrink-0" style={{ width: \'120px\' }}>\n                    <div className="w-[20px] shrink-0 flex justify-center mr-2.5">\n                      <svg \1</svg>\n                    </div>\n                    <span className="text-[12px] font-[500] text-[#3D4F63]">\2</span>\n                  </div>',
        content, flags=re.DOTALL
    )
    
    # Let's ensure the flexible side has flex-1
    content = content.replace(
        '<div className="relative">',
        '<div className="relative flex flex-1 items-center">'
    )
    # There's one row (time estimate) with `<div>\n                    {editingField === 'time'`
    content = content.replace(
        '                  <div>\n                    {editingField === \'time\'',
        '                  <div className="flex-1 flex items-center">\n                    {editingField === \'time\''
    )

    # 7. Ask Brain
    content = content.replace(
        '''<div className="w-fit flex items-center gap-1.5 cursor-pointer mt-4 opacity-60 hover:opacity-90 transition-opacity" style={{padding:'4px 9px',borderRadius:'5px',border:'1px solid #2D3748'}}>
                  <span className="text-[12px]">✨</span>
                  <span className="text-[11px] font-medium text-[#64748B]">Ask Brain to summarize, generate subtasks or find similar milestones</span>
                </div>''',
        '''<div className="w-fit flex items-center gap-2 cursor-pointer mt-4 opacity-80 hover:opacity-100 transition-opacity" style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #2D3748'}}>
                  <span className="text-[14px]">✨</span>
                  <span className="text-[12px] font-medium text-[#818CF8]">Ask Brain to summarize, generate subtasks or find similar milestones</span>
                </div>'''
    )

    # 3. Description interaction + 6. Action buttons anchoring
    content = content.replace(
        '''<div className="w-full relative group" style={{minHeight:'90px',backgroundColor:'#0D111A',borderRadius:'8px',padding:'10px 12px',border:'1px solid #263040',transition:'border-color 0.15s'}}>''',
        '''<div className="w-full relative group transition-all duration-200" style={{minHeight:'90px',backgroundColor:'#0D111A',borderRadius:'8px',padding:'12px 14px',border:`1px solid ${editingField==='description'?'#4F46E5':'#263040'}`,boxShadow:editingField==='description'?'0 0 0 3px rgba(79, 70, 229, 0.12)':''}} onMouseEnter={e=>{if(editingField!=='description')e.currentTarget.style.borderColor='#3A465B'}} onMouseLeave={e=>{if(editingField!=='description')e.currentTarget.style.borderColor='#263040'}}>'''
    )
    # Buttons anchoring
    content = content.replace(
        '''<div className="flex justify-end items-center gap-3 pt-2.5 border-t border-[#1E293B]">
                        <button className="text-[12px] font-medium text-[#475569] hover:text-zinc-300 transition-colors" onClick={()=>setEditingField(null)}>Cancel</button>
                        <button className="px-3.5 py-1.5 text-[12px] font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-500 active:scale-95 transition-all" onClick={()=>{if(editValue!==selectedIssue.description)updateTaskField('description',editValue);setEditingField(null);}}>Save changes</button>
                      </div>''',
        '''<div className="flex justify-end items-center gap-3 pt-3.5 mt-2 border-t border-[#1E293B]" style={{backgroundColor:'#0A0E14',margin:'0 -14px -12px -14px',padding:'12px 14px',borderRadius:'0 0 8px 8px'}}>
                        <button className="text-[12px] font-medium text-[#475569] hover:text-zinc-300 transition-colors" onClick={()=>setEditingField(null)}>Cancel</button>
                        <button className="px-4 py-1.5 text-[12px] font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-500 active:scale-95 transition-all shadow-sm" onClick={()=>{if(editValue!==selectedIssue.description)updateTaskField('description',editValue);setEditingField(null);}}>Save changes</button>
                      </div>'''
    )

    # 4. Subtasks improvements
    content = content.replace(
        '''<div key={st.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-[#131929]/60 group transition-colors border-b border-[#1A2236] last:border-b-0">''',
        '''<div key={st.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-[#1A2236]/80 group transition-colors border-b border-[#1A2236] last:border-b-0" style={{minHeight:'36px'}}>'''
    )
    content = content.replace(
        '''<div className="flex items-center px-3 py-2.5 hover:bg-[#131929]/40 transition-colors">''',
        '''<div className="flex items-center px-3 py-1.5 hover:bg-[#1A2236]/50 transition-colors focus-within:bg-[#1A2236]/80" style={{minHeight:'36px'}}>'''
    )
    content = content.replace(
        '''<input type="text" value={newSubtaskText} onChange={e=>setNewSubtaskText(e.target.value)} placeholder="Add a subtask..." className="flex-1 text-[13px] outline-none font-medium" style={{backgroundColor:'transparent',color:'#CBD5E1',border:'none','--placeholder-color':'#2D3F52'}} />''',
        '''<input type="text" value={newSubtaskText} onChange={e=>setNewSubtaskText(e.target.value)} placeholder="Add a subtask..." className="flex-1 text-[13px] outline-none font-medium placeholder-[#64748B]" style={{backgroundColor:'transparent',color:'#CBD5E1',border:'none'}} />'''
    )
    content = content.replace(
        '''<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2D3F52" strokeWidth="2.5" className="mr-2.5 shrink-0"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>''',
        '''<div className="w-[18px] flex justify-center shrink-0 mr-2.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </div>'''
    )

    # 5. Right panel structure
    content = content.replace(
        '''<div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4" style={{scrollbarColor:'#1A2436 transparent'}}>''',
        '''<div className="px-4 py-3 border-b border-[#1A2436] flex items-center justify-between bg-[#060910] shrink-0">
                    <h3 className="text-[12px] font-[600] text-[#E2E8F0] tracking-wide">Activity feed</h3>
                  </div>
                  {/* Feed — #7 increased padding */}
                  <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 bg-[#0A0D14]" style={{scrollbarColor:'#1A2436 transparent', boxShadow:'inset 0px 4px 6px -6px rgba(0,0,0,0.5)'}}>'''
    )
    # Increase text readability in right panel
    content = content.replace(
        '''<div className="text-[12px] text-zinc-300"><span className="font-semibold text-white">{selectedIssue.author}</span> created this task</div>''',
        '''<div className="text-[13px] text-zinc-200"><span className="font-semibold text-white">{selectedIssue.author}</span> created this task</div>'''
    )
    content = content.replace(
        '''<div className="text-[11px] text-[#334155] mt-0.5">{new Date(selectedIssue.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>''',
        '''<div className="text-[12px] text-[#475569] mt-0.5">{new Date(selectedIssue.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>'''
    )
    content = content.replace(
        '''<div className="text-[12px] text-zinc-300"><span className="font-semibold text-white">{c.author}</span></div>''',
        '''<div className="text-[13px] text-zinc-200"><span className="font-semibold text-white">{c.author}</span></div>'''
    )
    content = content.replace(
        '''<div className="text-[11px] text-[#334155] mt-0.5 mb-1">{new Date(c.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>''',
        '''<div className="text-[12px] text-[#475569] mt-0.5 mb-1.5">{new Date(c.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>'''
    )
    content = content.replace(
        '''<div className="text-[12px] text-zinc-200 px-2.5 py-2 rounded-lg border border-[#1E293B] bg-[#0D1117] whitespace-pre-wrap leading-[1.55]">{c.text}</div>''',
        '''<div className="text-[13px] text-zinc-200 px-3 py-2.5 rounded-lg border border-[#1E293B] bg-[#0D1117] whitespace-pre-wrap leading-[1.6] shadow-sm">{c.text}</div>'''
    )

    with open('src/pages/Discussions.jsx', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    apply_polish()
    print("Done")
