// ─────────────────────────────────────────────────────────────────────────
// NewTaskModal — token-driven, custom dropdowns, V2-style atoms.
//
// Drop-in replacement for src/components/NewTaskModal.jsx.
// Same props, same imports, same downstream calls.
// Visual changes only — no behavioral changes that would break callers.
// ─────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { taskService } from '../lib/services/taskService';
import { storageService } from '../lib/services/storageService';
import DOMPurify from 'dompurify';
import { useSystem } from './SystemUI';

// ── Inline icons ─────────────────────────────────────────────────────────
const SvgIcon = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {d}
  </svg>
);
const CloseIcon   = (p) => <SvgIcon {...p} d={<><path d="M18 6 6 18"/><path d="M6 6l12 12"/></>}/>;
const PlusIcon    = (p) => <SvgIcon {...p} d={<><path d="M12 5v14M5 12h14"/></>}/>;
const ChevronDown = (p) => <SvgIcon {...p} d={<polyline points="6 9 12 15 18 9"/>}/>;
const ImageIcon   = (p) => <SvgIcon {...p} d={<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></>}/>;
const LoaderIcon  = (p) => (
  <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none"
    style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2"/>
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const PRIORITY_OPTIONS = [
  { value: 'Low',    label: 'Low',    dot: 'var(--text-tertiary)' },
  { value: 'Medium', label: 'Medium', dot: 'var(--accent-warning)' },
  { value: 'High',   label: 'High',   dot: 'var(--alert-error-text)' },
];

// ── Popover (same lightweight version as in TaskDetailModal) ─────────────
const Popover = ({ open, onClose, anchorRef, children, width = 220 }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);
  if (!open) return null;
  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 4px)', left: 0,
      minWidth: width, maxHeight: 280, overflowY: 'auto',
      background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
      padding: 4, zIndex: 50,
    }}>{children}</div>
  );
};

const MenuItem = ({ children, onClick, selected }) => (
  <button type="button" onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
      padding: '7px 10px', textAlign: 'left',
      border: 'none', borderRadius: 'var(--radius-sm)',
      background: selected ? 'var(--bg-secondary)' : 'transparent',
      color: 'var(--text-primary)', fontFamily: 'inherit',
      fontSize: 13, fontWeight: 500, cursor: 'pointer',
    }}
    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.backgroundColor = 'transparent'; }}
  >{children}</button>
);

// ── Field with label ─────────────────────────────────────────────────────
const Field = ({ label, children, full }) => (
  <div style={{ gridColumn: full ? '1 / -1' : 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)',
    }}>{label}</label>
    {children}
  </div>
);

// ── Property button (used inside Field) ──────────────────────────────────
const PropButton = ({ children, onClick, anchorRef }) => (
  <button ref={anchorRef} type="button" onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 8, width: '100%', height: 36, padding: '0 12px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      color: 'var(--text-primary)',
      fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
      cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
    }}
    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 1px var(--border-focus)'; }}
    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
  >
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {children}
    </span>
    <ChevronDown size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}/>
  </button>
);

// ─────────────────────────────────────────────────────────────────────────

const NewTaskModal = ({ projectId, projectAssignee, users, currentUser, onClose, onTaskCreated }) => {
  const { toast, showConfirm } = useSystem();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('Medium');
  const [assignee, setAssignee] = useState(
    projectAssignee && projectAssignee !== 'Unassigned' ? projectAssignee : 'Unassigned'
  );
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [urgencyOpen, setUrgencyOpen] = useState(false);
  const assigneeAnchor = useRef(null);
  const urgencyAnchor = useRef(null);

  const handleRichTextPaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (html) {
      const clean = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'blockquote', 'span', 'div', 'h1', 'h2', 'h3'],
        ALLOWED_ATTR: ['href', 'target'],
        KEEP_CONTENT: true,
      });
      document.execCommand('insertHTML', false, clean);
    } else if (text) {
      document.execCommand('insertHTML', false, text.replace(/\n/g, '<br>'));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      let screenshotUrl = null;
      if (screenshotFile) {
        const ext = screenshotFile.name.split('.').pop();
        const path = `projects/${projectId}/tasks/new/screenshot_${Date.now()}.${ext}`;
        screenshotUrl = await storageService.uploadFile(path, screenshotFile);
      }
      const newTask = {
        title: title.trim(),
        description,
        status: 'To Do',
        urgency,
        assignee: assignee || 'Unassigned',
        screenshotUrl,
        timeEstimated: 0,
        startDate: null,
        dueDate: null,
        tags: [],
      };
      const created = await taskService.createTask(projectId, newTask);
      onTaskCreated(created);
      onClose();
    } catch (err) {
      console.error('Error adding task:', err);
      toast.error('Failed to create task: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEmptyDesc = !description || description.replace(/<[^>]*>?/gm, '').trim() === '';
  const isDirty = Boolean(title.trim() || !isEmptyDesc);

  const handleClose = useCallback(async () => {
    if (isDirty) {
      const discard = await showConfirm('You have unsaved changes. Discard?', 'Discard Changes?');
      if (!discard) return;
    }
    onClose();
  }, [isDirty, onClose, showConfirm]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const selectedUser = (users || []).find(u => u.id === assignee);
  const selectedUrgency = PRIORITY_OPTIONS.find(o => o.value === urgency) || PRIORITY_OPTIONS[1];

  return (
    <div
      className="fixed inset-0 z-[100] animate-fade-in flex items-center justify-center"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(8,7,6,0.62)', backdropFilter: 'blur(4px)' }}
      onClick={handleClose}
    >
      <div
        className="relative flex flex-col"
        style={{
          width: '95vw', maxWidth: '640px',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden', maxHeight: '92vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div style={{
          padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--text-tertiary)',
            }}>New task</div>
          </div>
          <button type="button" onClick={handleClose}
            style={{
              width: 28, height: 28, borderRadius: 'var(--radius-sm)',
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <CloseIcon size={14}/>
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="custom-scrollbar"
            style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', minHeight: 0 }}>

            {/* title */}
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title…" autoFocus required
              style={{
                width: '100%', padding: '4px 0', border: 'none',
                background: 'transparent', color: 'var(--text-primary)',
                fontFamily: 'inherit', fontSize: 22, fontWeight: 700,
                letterSpacing: '-0.02em', lineHeight: 1.25, outline: 'none',
                boxShadow: 'none',
              }}
            />

            {/* description */}
            <div style={{ position: 'relative' }}>
              {isEmptyDesc && (
                <div style={{
                  position: 'absolute', top: 14, left: 14, pointerEvents: 'none',
                  color: 'var(--text-tertiary)', fontSize: 14, fontStyle: 'italic',
                }}>Add a description, paste links, drop screenshots…</div>
              )}
              <div
                contentEditable suppressContentEditableWarning
                onBlur={(e) => setDescription(e.currentTarget.innerHTML)}
                onPaste={handleRichTextPaste}
                className="rich-text-editor custom-scrollbar"
                style={{
                  width: '100%', minHeight: 120, padding: 14,
                  fontSize: 14, lineHeight: 1.65, color: 'var(--text-primary)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none', cursor: 'text',
                  whiteSpace: 'normal', wordBreak: 'break-word',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-primary-muted)'; }}
                onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            {/* property grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Assignee">
                <div style={{ position: 'relative' }}>
                  <PropButton anchorRef={assigneeAnchor} onClick={() => setAssigneeOpen(v => !v)}>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: selectedUser ? 'var(--accent-primary-muted)' : 'var(--bg-tertiary)',
                      color: selectedUser ? 'var(--accent-primary-text)' : 'var(--text-tertiary)',
                      border: `1px solid ${selectedUser ? 'var(--accent-primary-border)' : 'var(--border-color)'}`,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700,
                    }}>{selectedUser?.name?.charAt(0)?.toUpperCase() || '?'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedUser?.name || 'Unassigned'}
                    </span>
                  </PropButton>
                  <Popover open={assigneeOpen} onClose={() => setAssigneeOpen(false)} anchorRef={assigneeAnchor} width={240}>
                    <MenuItem selected={assignee === 'Unassigned'}
                      onClick={() => { setAssignee('Unassigned'); setAssigneeOpen(false); }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)', color: 'var(--text-tertiary)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700,
                      }}>?</span>
                      Unassigned
                    </MenuItem>
                    <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }}/>
                    {(users || []).map(u => (
                      <MenuItem key={u.id} selected={u.id === assignee}
                        onClick={() => { setAssignee(u.id); setAssigneeOpen(false); }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'var(--accent-primary-muted)', color: 'var(--accent-primary-text)',
                          border: '1px solid var(--accent-primary-border)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700,
                        }}>{u.name?.charAt(0)?.toUpperCase()}</span>
                        {u.name}
                      </MenuItem>
                    ))}
                  </Popover>
                </div>
                {assignee === projectAssignee && projectAssignee && projectAssignee !== 'Unassigned' && (
                  <div style={{
                    marginTop: 4, fontSize: 11, color: 'var(--accent-primary-text)',
                    fontWeight: 500, lineHeight: 1.3,
                  }}>
                    Auto-selected from project lead
                  </div>
                )}
              </Field>

              <Field label="Priority">
                <div style={{ position: 'relative' }}>
                  <PropButton anchorRef={urgencyAnchor} onClick={() => setUrgencyOpen(v => !v)}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: selectedUrgency.dot }}/>
                    {selectedUrgency.label}
                  </PropButton>
                  <Popover open={urgencyOpen} onClose={() => setUrgencyOpen(false)} anchorRef={urgencyAnchor}>
                    {PRIORITY_OPTIONS.map(o => (
                      <MenuItem key={o.value} selected={o.value === urgency}
                        onClick={() => { setUrgency(o.value); setUrgencyOpen(false); }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: o.dot }}/>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Popover>
                </div>
              </Field>
            </div>

            {/* screenshot */}
            <Field label="Attach screenshot · optional" full>
              <label
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 10, width: '100%', padding: '14px 16px',
                  background: 'var(--bg-secondary)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-tertiary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              >
                <ImageIcon size={16}/>
                {screenshotFile
                  ? <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{screenshotFile.name}</span>
                  : <span>Click to attach an image</span>
                }
                <input type="file" accept="image/*"
                  onChange={(e) => setScreenshotFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </label>
            </Field>
          </div>

          {/* footer */}
          <div style={{
            padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              <kbd style={kbdStyle}>Esc</kbd> to cancel
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" disabled={isSubmitting} onClick={handleClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting || !title.trim()} className="btn btn-primary">
                {isSubmitting
                  ? <><LoaderIcon size={14}/> Creating…</>
                  : <><PlusIcon size={14}/> Create task</>
                }
              </button>
            </div>
          </div>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: var(--bg-tertiary) transparent; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--bg-tertiary); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }

        .rich-text-editor { outline: none !important; }
        .rich-text-editor:focus { outline: none !important; }
        .rich-text-editor * {
          font-size: inherit !important; font-family: inherit !important; line-height: inherit !important;
        }
        .rich-text-editor p, .rich-text-editor div { margin: 0 0 0.5em 0 !important; }
        .rich-text-editor ul, .rich-text-editor ol { padding-left: 24px !important; margin: 0.5em 0 !important; }
        .rich-text-editor ul { list-style: disc !important; }
        .rich-text-editor ol { list-style: decimal !important; }
        .rich-text-editor li { display: list-item !important; margin-bottom: 0.25em !important; }
        .rich-text-editor blockquote {
          border-left: 3px solid var(--accent-primary) !important;
          padding-left: 12px !important; margin: 1em 0 !important;
          color: var(--text-secondary) !important; font-style: italic !important;
        }
        .rich-text-editor a {
          color: var(--accent-primary-text) !important; text-decoration: underline !important;
        }
      ` }}/>
    </div>
  );
};

const kbdStyle = {
  display: 'inline-block', padding: '1px 5px', borderRadius: 4,
  background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
  color: 'var(--text-secondary)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 10, fontWeight: 500,
};

export default NewTaskModal;
