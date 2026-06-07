import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, MoreHorizontal, Trash2, User, Calendar, AlignLeft } from 'lucide-react';
import DOMPurify from 'dompurify';

// Custom property dropdown (spec §4) for assignee inside expanded subtask.
// No native <select> — a popover of rows, so the OS-blue dropdown never appears.
const GhostDropdown = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selectedLabel = options.find(opt => opt.value === value)?.label || value;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', width: 'fit-content' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginLeft: -8, padding: '4px 8px', borderRadius: 'var(--radius-sm)',
          background: open ? 'var(--bg-secondary)' : 'transparent',
          border: 'none', cursor: 'pointer', transition: 'background 120ms',
          color: 'var(--text-primary)', fontSize: 14, fontWeight: 500,
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <span>{selectedLabel}</span>
        <svg style={{ color: 'var(--text-tertiary)' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="custom-scrollbar animate-fade-in"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
            minWidth: 180, maxHeight: 260, overflowY: 'auto',
            padding: 4, borderRadius: 'var(--radius-md)',
            background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {options.map(opt => {
            const isSel = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSel}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  width: '100%', textAlign: 'left',
                  padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                  background: isSel ? 'var(--bg-secondary)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: 'var(--text-primary)', fontSize: 14, fontWeight: isSel ? 600 : 500,
                  transition: 'background 120ms',
                }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                {isSel && <Check size={14} color="var(--accent-primary-text)" style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function TaskSubtasksList({
  subtasks = [],
  users = [],
  newSubtaskText, setNewSubtaskText,
  onAdd, onToggle, onUpdate, onDelete,
  handleRichTextPaste,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const list = Array.isArray(subtasks) ? subtasks : [];

  return (
    <div className="flex flex-col shrink-0 gap-3" style={{ marginTop: '1rem', marginBottom: '2rem' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Subtasks</h3>

      <div style={{
        display: 'flex', flexDirection: 'column',
        borderRadius: 12, overflow: 'hidden',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {list.map(st => (
          <div key={st.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'var(--bg-primary)',
              gap: 16, transition: 'background-color 120ms',
            }}>
              {/* CHECKBOX */}
              <button
                onClick={() => onToggle(st.id)}
                title="Mark as complete"
                style={{
                  flexShrink: 0, width: 22, height: 22, minWidth: 22, minHeight: 22,
                  borderRadius: 6,
                  border: st.completed ? '2px solid var(--accent-primary)' : '2px solid var(--text-tertiary)',
                  backgroundColor: st.completed ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 120ms', outline: 'none', padding: 0,
                }}
              >
                {st.completed && <Check size={14} color="white" strokeWidth={3} />}
              </button>

              {/* TITLE */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingId === st.id ? (
                  <input
                    autoFocus type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={() => {
                      if (editName.trim() && editName.trim() !== st.text) onUpdate(st.id, 'text', editName.trim());
                      setEditingId(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (editName.trim() && editName.trim() !== st.text) onUpdate(st.id, 'text', editName.trim());
                        setEditingId(null);
                      } else if (e.key === 'Escape') setEditingId(null);
                    }}
                    style={{
                      width: '100%', backgroundColor: 'var(--bg-tertiary)',
                      borderRadius: 4, padding: '6px 12px',
                      border: '1px solid var(--accent-primary)',
                      fontSize: 14, color: 'var(--text-primary)', outline: 'none',
                    }}
                  />
                ) : (
                  <span
                    onClick={() => { setEditingId(st.id); setEditName(st.text); }}
                    title="Click to edit subtask name"
                    style={{
                      display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontSize: 14, cursor: 'text', userSelect: 'none', padding: '6px 0',
                      textDecoration: st.completed ? 'line-through' : 'none',
                      color: st.completed ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    }}
                  >{st.text}</span>
                )}
              </div>

              {/* EXPAND ACTION */}
              <button
                onClick={() => {
                  if (expandedId === st.id) setExpandedId(null);
                  else setExpandedId(st.id);
                }}
                title="Edit details"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: expandedId === st.id ? 'var(--accent-primary-muted)' : 'var(--bg-tertiary)',
                  color: expandedId === st.id ? 'var(--accent-primary-text)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer', transition: 'all 120ms',
                }}
              >
                <MoreHorizontal size={18} />
              </button>
            </div>

            {/* EXPANDED PANEL */}
            {expandedId === st.id && (
              <div style={{
                padding: 20, backgroundColor: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column', gap: 20, position: 'relative',
              }}>
                <button
                  onClick={() => onDelete(st.id)}
                  title="Delete subtask"
                  style={{
                    position: 'absolute', top: 16, right: 20,
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 12px', borderRadius: 8,
                    backgroundColor: 'var(--alert-error-bg)',
                    color: 'var(--alert-error-text)',
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.05em',
                    cursor: 'pointer', border: 'none',
                  }}
                >
                  <Trash2 size={14} /> DELETE
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, paddingRight: 100 }}>
                  <Field label="Assignee" icon={<User size={12} color="var(--text-tertiary)" />}>
                    <GhostDropdown
                      value={st.assignee || 'Unassigned'}
                      onChange={(val) => onUpdate(st.id, 'assignee', val)}
                      options={[{ value: 'Unassigned', label: 'Unassigned' }, ...users.map(u => ({ value: u.id, label: u.name }))]}
                    />
                  </Field>
                  <Field label="Due Date" icon={<Calendar size={12} color="var(--text-tertiary)" />}>
                    <input
                      type="date" value={st.dueDate || ''}
                      onChange={e => onUpdate(st.id, 'dueDate', e.target.value)}
                      style={{
                        backgroundColor: 'transparent', color: 'var(--text-primary)',
                        fontSize: 14, fontWeight: 500, border: 'none', outline: 'none',
                        cursor: 'pointer', padding: 0,
                      }}
                    />
                  </Field>
                </div>

                <Field label="Description" icon={<AlignLeft size={12} color="var(--text-tertiary)" />}>
                  <div
                    contentEditable suppressContentEditableWarning
                    onBlur={e => {
                      const html = e.currentTarget.innerHTML;
                      if (html !== (st.description || '')) onUpdate(st.id, 'description', html);
                    }}
                    onPaste={handleRichTextPaste}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        (st.description || '').includes('<') ? st.description : (st.description || '').replace(/\n/g, '<br>')
                      )
                    }}
                    className="rich-text-editor custom-scrollbar"
                    style={{
                      width: '100%', backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)', borderRadius: 8,
                      padding: 12, fontSize: 13, color: 'var(--text-primary)',
                      outline: 'none', minHeight: 90,
                      whiteSpace: 'normal', wordBreak: 'break-word', overflowY: 'auto',
                    }}
                  />
                </Field>
              </div>
            )}
          </div>
        ))}

        {/* ADD ROW */}
        <form
          onSubmit={onAdd}
          onClick={() => document.getElementById('new-subtask-input')?.focus()}
          style={{
            padding: 16, backgroundColor: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'text',
          }}
        >
          <Plus size={18} color="var(--text-tertiary)" />
          <input
            id="new-subtask-input"
            type="text" placeholder="Add new subtask…"
            value={newSubtaskText}
            onChange={e => setNewSubtaskText(e.target.value)}
            style={{
              width: '100%', fontSize: 14,
              backgroundColor: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)',
            }}
          />
        </form>
      </div>
    </div>
  );
}

const Field = ({ label, icon, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
      {icon} {label}
    </label>
    <div style={{ minHeight: 32, display: 'flex', alignItems: 'center' }}>
      {children}
    </div>
  </div>
);
