import re

def migrate_to_bw():
    with open('src/pages/Discussions.jsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Colors & Theme (Black & White only)
    # Backgrounds
    content = content.replace("backgroundColor: '#0D1117'", "backgroundColor: '#000000'")
    content = content.replace("backgroundColor: '#060910'", "backgroundColor: '#000000'")
    content = content.replace("backgroundColor: '#0B0F18'", "backgroundColor: '#0A0A0A'")
    content = content.replace("backgroundColor: '#0D111A'", "backgroundColor: '#0A0A0A'")
    content = content.replace("backgroundColor:'#0A0E14'", "backgroundColor:'#0A0A0A'")
    content = content.replace("backgroundColor: '#080C12'", "backgroundColor: '#000000'")
    content = content.replace("backgroundColor: '#0B0F17'", "backgroundColor: '#0A0A0A'")
    content = content.replace("bg-[#060910]", "bg-black")
    content = content.replace("bg-[#0A0D14]", "bg-black")
    content = content.replace("bg-[#0D1117]", "bg-[#0A0A0A]")
    
    # Borders
    content = content.replace("border: '1px solid #1E293B'", "border: '1px solid #333333'")
    content = content.replace("border: '1px solid #1A2436'", "border: '1px solid #333333'")
    content = content.replace("border: '1px solid #263040'", "border: '1px solid #333333'")
    content = content.replace("borderBottom: '2px solid #6366f1'", "borderBottom: '2px solid #FFFFFF'")
    content = content.replace("borderColor: '#334155'", "borderColor: '#555555'")
    content = content.replace("hover:border-[#3A465B]", "hover:border-[#666666]")
    content = content.replace("border-[#1E293B]", "border-[#333333]")
    content = content.replace("border-[#1A2436]", "border-[#333333]")
    content = content.replace("border-[#1A2236]", "border-[#333333]")

    # Text Colors
    content = content.replace("color: '#E5E7EB'", "color: '#FFFFFF'")
    content = content.replace("color: '#F1F5F9'", "color: '#FFFFFF'")
    content = content.replace("color: '#E2E8F0'", "color: '#FFFFFF'")
    content = content.replace("color: '#CBD5E1'", "color: '#CCCCCC'")
    content = content.replace("color: '#94A3B8'", "color: '#CCCCCC'")
    content = content.replace("color: '#475569'", "color: '#888888'")
    content = content.replace("color: '#3D4F63'", "color: '#888888'")
    content = content.replace("color: '#334155'", "color: '#666666'")
    content = content.replace("text-[#E2E8F0]", "text-white")
    content = content.replace("text-[#F1F5F9]", "text-white")
    content = content.replace("text-[#CBD5E1]", "text-[#CCCCCC]")
    content = content.replace("text-zinc-200", "text-white")
    content = content.replace("text-zinc-300", "text-white")
    content = content.replace("text-[#475569]", "text-[#888888]")
    content = content.replace("text-[#3D4F63]", "text-[#888888]")
    content = content.replace("text-[#2D3F52]", "text-[#666666]")
    content = content.replace("text-zinc-400", "text-[#888888]")
    content = content.replace("text-zinc-500", "text-[#666666]")
    content = content.replace("text-zinc-600", "text-[#666666]")
    content = content.replace("text-zinc-700", "text-[#444444]")

    # Indigo / Accent Colors -> White / Black
    content = content.replace("bg-indigo-600", "bg-white text-black")
    content = content.replace("text-white rounded-md hover:bg-indigo-500", "text-black rounded-md hover:bg-gray-200")
    content = content.replace("'#4F46E5'", "'#FFFFFF'")
    content = content.replace("rgba(79, 70, 229, 0.12)", "rgba(255, 255, 255, 0.15)")
    content = content.replace("border-indigo-500/30", "border-white/50")
    content = content.replace("text-[#818CF8]", "text-white")
    
    # SVG Strokes
    content = content.replace("stroke=\"#3D4F63\"", "stroke=\"#888888\"")
    content = content.replace("stroke=\"#475569\"", "stroke=\"#888888\"")

    # Status Badges
    content = re.sub(
        r"backgroundColor: selectedIssue\.status === 'Done' \? '[^']+' : selectedIssue\.status === 'In Progress' \? '[^']+' : '[^']+'",
        "backgroundColor: '#000000'",
        content
    )
    content = re.sub(
        r"color: selectedIssue\.status === 'Done' \? '[^']+' : selectedIssue\.status === 'In Progress' \? '[^']+' : '[^']+'",
        "color: '#FFFFFF'",
        content
    )
    content = re.sub(
        r"border: `1px solid \$\{selectedIssue\.status === 'Done' \? '[^']+' : selectedIssue\.status === 'In Progress' \? '[^']+' : '[^']+'\}`",
        "border: '1px solid #555555'",
        content
    )

    # Subtask Checkboxes
    content = content.replace("backgroundColor:st.completed?'#10B981':'transparent'", "backgroundColor:st.completed?'#FFFFFF':'transparent'")
    content = content.replace("border:`1.5px solid ${st.completed?'#10B981':'#2D3F52'}`", "border:`1.5px solid ${st.completed?'#FFFFFF':'#555555'}`")
    content = content.replace("stroke=\"white\"", "stroke=\"black\"")
    content = content.replace("line-through text-[#334155]", "line-through text-[#555555]")

    # Popovers / Hovers
    content = content.replace("hover:bg-[#1E293B]", "hover:bg-[#222222]")
    content = content.replace("hover:bg-[#0F172A]", "hover:bg-[#222222]")
    content = content.replace("hover:bg-[#1A2236]/80", "hover:bg-[#222222]")
    content = content.replace("focus-within:bg-[#1A2236]/80", "focus-within:bg-[#222222]")
    content = content.replace("bg-[#1E293B]", "bg-[#333333]")

    # 4. Activity feed layout fix (avatar overlap)
    # The avatar container needs fixed constraints (`minWidth`, `width`) so flex doesn't squash it.
    content = content.replace(
        '''<div className="w-7 h-7 rounded-full bg-[#333333] flex items-center justify-center text-[11px] text-white shrink-0 font-bold">{selectedIssue.author.charAt(0)}</div>''',
        '''<div className="w-8 h-8 rounded-full border border-[#555555] bg-black flex items-center justify-center text-[12px] text-white shrink-0 font-bold">{selectedIssue.author.charAt(0)}</div>'''
    )
    content = content.replace(
        '''<div className="w-7 h-7 rounded-full bg-[#333333] flex items-center justify-center text-[11px] text-white shrink-0 font-bold">{c.author.charAt(0)}</div>''',
        '''<div className="w-8 h-8 rounded-full border border-[#555555] bg-black flex items-center justify-center text-[12px] text-white shrink-0 font-bold">{c.author.charAt(0)}</div>'''
    )

    # 2. Scrollable Modal
    # Remove height constraints and overflow-hidden from modal container, let it scroll as one document
    content = content.replace(
        '''<div className="relative flex shadow-2xl w-[95vw] max-w-[1100px]" style={{ height: '80vh', maxHeight: '820px', minHeight: '650px', backgroundColor: '#000000', border: '1px solid #333333', borderRadius: '12px', padding: '0', gap: '0', color: '#FFFFFF', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>''',
        '''<div className="relative flex shadow-2xl w-[95vw] max-w-[1100px]" style={{ maxHeight: '90vh', backgroundColor: '#000000', border: '1px solid #333333', borderRadius: '12px', padding: '0', gap: '0', color: '#FFFFFF', overflowY: 'auto', overflowX: 'hidden' }} onClick={e => e.stopPropagation()}>'''
    )
    # Since modal wrapper flows by its contents now, we make left and right sidebars height: auto
    # Remove `h-full overflow-y-auto` from left side
    content = content.replace(
        '''<div className="flex flex-col h-full overflow-y-auto flex-1" style={{ padding: '24px 24px 0 24px', gap: '18px', scrollbarColor: '#333333 transparent' }}>''',
        '''<div className="flex flex-col flex-1" style={{ padding: '24px 24px 24px 24px', gap: '18px', minHeight: '650px' }}>'''
    )
    # Remove `overflow: 'hidden'` from right side, and `overflow-y-auto` from feeds
    content = content.replace(
        '''<div className="flex flex-col shrink-0" style={{width:'290px',backgroundColor:'#000000',borderLeft:'1px solid #333333',overflow:'hidden'}}>''',
        '''<div className="flex flex-col shrink-0" style={{width:'320px',backgroundColor:'#000000',borderLeft:'1px solid #333333'}}>'''
    )
    content = content.replace(
        '''<div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 bg-black" style={{scrollbarColor:'#333333 transparent', boxShadow:'inset 0px 4px 6px -6px rgba(0,0,0,0.5)'}}>''',
        '''<div className="flex-1 flex flex-col gap-5 p-4 bg-black">'''
    )

    # 1. Seamless Description Editor (Always editable, no buttons)
    desc_block_regex = r'\{/\* Description.*?<h3 className="text-\[11px\] font-\[700\] uppercase tracking-widest text-\[#888888\]">Description</h3>\s*<div className="w-full relative group transition-all duration-200"(.*?)>\s*\{editingField===\'description\' \? \(.*?\)\s*</div>\s*</div>\s*\{/\* Subtasks'
    
    seamless_desc = '''{/* Seamless Description */}
              <div className="flex flex-col shrink-0" style={{ gap: '8px' }}>
                <h3 className="text-[11px] font-[700] uppercase tracking-widest text-[#888888]">Description</h3>
                <div className="w-full relative flex flex-col" style={{minHeight:'120px',backgroundColor:'#0A0A0A',borderRadius:'8px',padding:'12px 14px',border:'1px solid #333333', transition: 'border-color 0.2s'}} onFocus={e=>e.currentTarget.style.borderColor='#FFFFFF'} onBlur={e=>e.currentTarget.style.borderColor='#333333'}>
                  <textarea 
                    value={editValue !== undefined && editingField === 'description' ? editValue : (selectedIssue.description || '')} 
                    onFocus={() => { setEditingField('description'); setEditValue(selectedIssue.description || ''); }}
                    onChange={e => setEditValue(e.target.value)} 
                    onBlur={() => { updateTaskField('description', editValue); setEditingField(null); }}
                    className="w-full h-full min-h-[100px] text-[14px] leading-[1.65] outline-none resize-none" 
                    style={{backgroundColor:'transparent',color:'#FFFFFF',border:'none',padding:0}} 
                    placeholder="Click to start writing details..."
                  />
                </div>
              </div>

              {/* Subtasks'''

    content = re.sub(desc_block_regex, seamless_desc, content, flags=re.DOTALL)

    with open('src/pages/Discussions.jsx', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    migrate_to_bw()
    print("MIGRATION COMPLETE")
