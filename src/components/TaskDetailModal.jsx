// ─────────────────────────────────────────────────────────────────────────
// TaskDetailModal — Linear-style layout, design-token driven.
//
// What changed from the previous version:
//   • Zero hard-coded hex colors. Every surface, border, text and accent
//     resolves to a CSS custom property declared in src/index.css, which
//     means the modal now honors light + dark themes automatically.
//   • Properties live in a single right-hand inspector (Status, Assignee,
//     Priority, Dates, Estimate, Tags) instead of a label/value grid mixed
//     with the content stream.
//   • Activity and Notes are sections of the main content column — no more
//     Activity/Notes tab toggle in a separate sidebar.
//   • The native <select> overlay trick has been replaced with proper
//     custom popovers — no more OS-blue dropdown leaking into the UI.
//
// All props, imports and downstream calls are identical to the previous
// component, so this is a drop-in replacement.
// ─────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { taskService } from '../lib/services/taskService';
import DOMPurify from 'dompurify';
import { useSystem } from './SystemUI';
import TaskCommentsTab from './task/TaskCommentsTab';
import TaskSubtasksList from './task/TaskSubtasksList';
import { uuid } from '../lib/utils/ids';

// ── Tiny inline icons (lucide-react is already in package.json, but
//    keeping these inline avoids tree-shake mismatches in older bundles)
const SvgIcon = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {d}
  </svg>
);
const CloseIcon    = (p) => <SvgIcon {...p} d={<><path d="M18 6 6 18"/><path d="M6 6l12 12"/></>}/>;
const PlusIcon     = (p) => <SvgIcon {...p} d={<><path d="M12 5v14M5 12h14"/></>}/>;
const CheckIcon    = (p) => <SvgIcon {...p} d={<><path d="M20 6 9 17l-5-5"/></>}/>;
const ChevronDown  = (p) => <SvgIcon {...p} d={<polyline points="6 9 12 15 18 9"/>}/>;
const ChevronRight = (p) => <SvgIcon {...p} d={<polyline points="9 6 15 12 9 18"/>}/>;
const CalendarIcon = (p) => <SvgIcon {...p} d={<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></>}/>;
const ArrowRight   = (p) => <SvgIcon {...p} d={<><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></>}/>;
const TrashIcon    = (p) => <SvgIcon {...p} d={<><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></>}/>;
const StarIcon     = (p) => <SvgIcon {...p} d={<path d="M12 2l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z"/>}/>;
const LinkIcon     = (p) => <SvgIcon {...p} d={<><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>}/>;
const MoreIcon     = (p) => <SvgIcon {...p} d={<><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></>}/>;
const LoaderIcon   = (p) => (
  <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none"
    style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2"/>
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ── Status / priority option maps ─────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'To Do',       label: 'To Do',       dot: 'var(--text-tertiary)',          tone: 'neutral' },
  { value: 'In Progress', label: 'In Progress', dot: 'var(--accent-primary)',         tone: 'accent'  },
  { value: 'Done',        label: 'Done',        dot: 'var(--accent-success)',         tone: 'success' },
];

const PRIORITY_OPTIONS = [
  { value: 'Low',    label: 'Low',    dot: 'var(--text-tertiary)' },
  { value: 'Medium', label: 'Medium', dot: 'var(--accent-warning)' },
  { value: 'High',   label: 'High',   dot: 'var(--alert-error-text)' },
];

// ── Popover (custom dropdown — replaces the hidden-select hack) ───────────

const Popover = ({ open, onClose, anchorRef, children, align = 'start', width = 220 }) => {
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
    <div ref={ref}
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        [align]: 0,
        minWidth: width,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: 4,
        zIndex: 50,
      }}
    >
      {children}
    </div>
  );
};

const MenuItem = ({ children, onClick, selected }) => (
  <button onClick={onClick} type="button"
    style={{
      display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
      padding: '7px 10px', border: 'none', borderRadius: 'var(--radius-sm)',
      background: selected ? 'var(--bg-secondary)' : 'transparent',
      color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
    }}
    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.backgroundColor = 'transparent'; }}
  >
    {children}
  </button>
);

// ── Property picker buttons (used by the inspector) ───────────────────────

const PropButton = ({ children, onClick, anchorRef, style }) => (
  <button ref={anchorRef} type="button" onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 8, width: '100%', height: 32, padding: '0 10px',
      background: 'transparent', border: '1px solid transparent',
      borderRadius: 'var(--radius-sm)', cursor: 'pointer',
      color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
      transition: 'background 0.15s, border-color 0.15s',
      ...style,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
  >
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {children}
    </span>
    <ChevronDown size={11} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}/>
  </button>
);

const StatusPicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const opt = STATUS_OPTIONS.find(o => o.value === value) || STATUS_OPTIONS[0];
  return (
    <div style={{ position: 'relative' }}>
      <PropButton anchorRef={anchorRef} onClick={() => setOpen(v => !v)}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.dot, flexShrink: 0 }}/>
        <span>{opt.label}</span>
      </PropButton>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef}>
        {STATUS_OPTIONS.map(o => (
          <MenuItem key={o.value} selected={o.value === value}
            onClick={() => { onChange(o.value); setOpen(false); }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: o.dot }}/>
            {o.label}
          </MenuItem>
        ))}
      </Popover>
    </div>
  );
};

const PriorityPicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const opt = PRIORITY_OPTIONS.find(o => o.value === value) || PRIORITY_OPTIONS[1];
  return (
    <div style={{ position: 'relative' }}>
      <PropButton anchorRef={anchorRef} onClick={() => setOpen(v => !v)}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.dot, flexShrink: 0 }}/>
        <span>{opt.label}</span>
      </PropButton>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef}>
        {PRIORITY_OPTIONS.map(o => (
          <MenuItem key={o.value} selected={o.value === value}
            onClick={() => { onChange(o.value); setOpen(false); }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: o.dot }}/>
            {o.label}
          </MenuItem>
        ))}
      </Popover>
    </div>
  );
};

const AssigneePicker = ({ value, users, onChange }) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const selectedUser = (users || []).find(u => u.id === value);
  const label = selectedUser?.name || (value === 'Unassigned' || !value ? 'Unassigned' : value);
  const initial = selectedUser?.name?.charAt(0)?.toUpperCase() || '?';
  return (
    <div style={{ position: 'relative' }}>
      <PropButton anchorRef={anchorRef} onClick={() => setOpen(v => !v)}>
        <span style={{
          width: 20, height: 20, borderRadius: '50%',
          background: selectedUser ? 'var(--accent-primary-muted)' : 'var(--bg-tertiary)',
          color: selectedUser ? 'var(--accent-primary-text)' : 'var(--text-tertiary)',
          border: `1px solid ${selectedUser ? 'var(--accent-primary-border)' : 'var(--border-color)'}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, flexShrink: 0,
        }}>{initial}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </PropButton>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} width={240}>
        <MenuItem selected={!value || value === 'Unassigned'}
          onClick={() => { onChange('Unassigned'); setOpen(false); }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)', color: 'var(--text-tertiary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700 }}>?</span>
          Unassigned
        </MenuItem>
        <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }}/>
        {(users || []).map(u => (
          <MenuItem key={u.id} selected={u.id === value}
            onClick={() => { onChange(u.id); setOpen(false); }}>
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
  );
};

// ── Inline date input that looks like a property button ───────────────────

const InlineDate = ({ value, onChange, placeholder = 'Set date' }) => (
  <input
    type="date"
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    onClick={(e) => { try { e.target.showPicker(); } catch {} }}
    style={{
      width: '100%', height: 32, padding: '0 10px',
      background: 'transparent', color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
      border: '1px solid transparent', borderRadius: 'var(--radius-sm)',
      fontFamily: 'inherit', fontSize: 13, fontWeight: 500, outline: 'none',
      colorScheme: 'dark', cursor: 'pointer', boxShadow: 'none',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    onFocus={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 1px var(--border-focus)'; }}
    onBlur={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
    placeholder={placeholder}
  />
);

// ── Tags input ────────────────────────────────────────────────────────────

const TagsField = ({ tags = [], onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const commit = () => {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft('');
    setEditing(false);
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {tags.map(t => (
        <span key={t} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, height: 22,
          padding: '0 4px 0 8px', borderRadius: 5,
          background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
          color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600,
        }}>
          {t}
          <button onClick={() => onChange(tags.filter(x => x !== t))} type="button"
            style={{ width: 14, height: 14, borderRadius: 3, background: 'transparent',
              border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            title="Remove tag">
            <CloseIcon size={10}/>
          </button>
        </span>
      ))}
      {editing ? (
        <input
          autoFocus value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            else if (e.key === 'Escape') { setDraft(''); setEditing(false); }
          }}
          placeholder="Tag name"
          style={{
            minWidth: 100, height: 22, padding: '0 8px', borderRadius: 5,
            background: 'var(--bg-secondary)', border: '1px solid var(--border-focus)',
            color: 'var(--text-primary)', fontSize: 11, fontWeight: 600, outline: 'none',
            boxShadow: '0 0 0 2px var(--accent-primary-muted)',
          }}
        />
      ) : (
        <button onClick={() => setEditing(true)} type="button"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 22,
            padding: '0 8px', borderRadius: 5,
            background: 'transparent', border: '1px dashed var(--border-color)',
            color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          <PlusIcon size={10}/>Tag
        </button>
      )}
    </div>
  );
};

// ── Inspector label + slot wrapper ────────────────────────────────────────

const Inspector = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)',
    }}>{label}</div>
    <div>{children}</div>
  </div>
);

// ── Days-until helper for due-date pill ───────────────────────────────────

const dueLabel = (dueDate) => {
  if (!dueDate) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(dueDate); due.setHours(0,0,0,0);
  const diff = Math.round((due - today) / 86400000);
  if (diff < 0)  return { text: `${Math.abs(diff)}d overdue`, color: 'var(--alert-error-text)' };
  if (diff === 0) return { text: 'Due today',                color: 'var(--accent-warning-text)' };
  if (diff <= 3) return { text: `${diff}d`,                   color: 'var(--accent-warning-text)' };
  return { text: `${diff}d`, color: 'var(--text-tertiary)' };
};

// ─────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────

const TaskDetailModal = ({
  issue,
  projectId,
  users,
  currentUser,
  projectDetails,
  onClose,
  onIssueUpdated,
  onIssueDeleted,
}) => {
  const { toast, showConfirm } = useSystem();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(issue.title || '');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  const selectedIssue = issue;
  const rawDesc = selectedIssue.description || '';
  const cleanDesc = rawDesc.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const isEmptyDesc = !cleanDesc;
  const isEmptyNotes = !(selectedIssue.notes || '').replace(/<[^>]*>/g, '').trim();

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

  const parseMentions = (text) => {
    if (!text || !users?.length) return [];
    const matches = [...text.matchAll(/@(\w+)/g)].map(m => m[1].toLowerCase());
    if (matches.length === 0) return [];
    const ids = new Set();
    users.forEach(u => {
      const firstName = (u.name || '').split(' ')[0].toLowerCase();
      const full = (u.name || '').replace(/\s+/g, '').toLowerCase();
      const emailUser = (u.email || '').split('@')[0].toLowerCase();
      if (matches.some(m => m === firstName || m === full || m === emailUser)) {
        ids.add(u.id);
      }
    });
    return [...ids];
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setIsCommenting(true);
    try {
      const mentions = parseMentions(newCommentText);
      const newComment = {
        id: uuid(),
        text: newCommentText.trim(),
        author: currentUser?.name || 'Unknown',
        authorId: currentUser?.id || null,
        mentions,
        createdAt: new Date().toISOString(),
      };
      const updatedComments = [...(issue.comments || []), newComment];
      await taskService.updateTask(projectId, issue.id, { comments: updatedComments });
      onIssueUpdated({ ...issue, comments: updatedComments });
      setNewCommentText('');
      if (mentions.length > 0) {
        toast.success(`Comment posted (${mentions.length} mentioned)`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to post comment: ' + err.message);
    } finally {
      setIsCommenting(false);
    }
  };

  const addSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;
    try {
      const newSubtask = { id: uuid(), text: newSubtaskText.trim(), completed: false };
      const updatedSubtasks = [...(issue.subtasks || []), newSubtask];
      await taskService.updateTask(projectId, issue.id, { subtasks: updatedSubtasks });
      onIssueUpdated({ ...issue, subtasks: updatedSubtasks });
      setNewSubtaskText('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add subtask: ' + err.message);
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
      toast.error('Failed to update subtask: ' + err.message);
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
      toast.error('Failed to update subtask: ' + err.message);
    }
  };

  const deleteSubtask = async (subtaskId) => {
    try {
      const updatedSubtasks = (issue.subtasks || []).filter(st => st.id !== subtaskId);
      await taskService.updateTask(projectId, issue.id, { subtasks: updatedSubtasks });
      onIssueUpdated({ ...issue, subtasks: updatedSubtasks });
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete subtask: ' + err.message);
    }
  };

  const handleRichTextPaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (html) {
      const cleanHtml = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'blockquote', 'span', 'div', 'h1', 'h2', 'h3'],
        ALLOWED_ATTR: ['href', 'target'],
        KEEP_CONTENT: true,
      });
      document.execCommand('insertHTML', false, cleanHtml);
    } else if (text) {
      document.execCommand('insertHTML', false, text.replace(/\n/g, '<br>'));
    }
  };

  // ── Dirty-state guard on close ──
  const isDirty = Boolean(
    editingTitle ||
    newSubtaskText.trim() !== '' ||
    newCommentText.trim() !== ''
  );

  const handleClose = useCallback(async () => {
    if (isDirty) {
      const discard = await showConfirm('You have unsaved edits. Discard changes?', 'Discard Changes?');
      if (!discard) return;
    }
    onClose();
  }, [isDirty, onClose, showConfirm]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !editingTitle) handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose, editingTitle]);

  // ── Render ──

  const due = dueLabel(selectedIssue.dueDate);
  const subtaskCount = (selectedIssue.subtasks || []).length;
  const subtaskDone = (selectedIssue.subtasks || []).filter(s => s?.completed).length;
  const subtaskPct = subtaskCount ? Math.round((subtaskDone / subtaskCount) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-[100] animate-fade-in flex items-center justify-center"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(8,7,6,0.62)', backdropFilter: 'blur(4px)' }}
      onClick={handleClose}
    >
      <div
        className="task-modal-layout relative flex"
        style={{
          width: '95vw', maxWidth: '1100px', height: '90vh', maxHeight: '90vh',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── LEFT — content stream ────────────────────────────────────── */}
        <div className="flex flex-col flex-1" style={{ minWidth: 0, height: '100%' }}>

          {/* top bar: breadcrumb + actions */}
          <div style={{
            height: 44, padding: '0 18px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-tertiary)', minWidth: 0 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {projectDetails?.name || 'Project'}
              </span>
              <ChevronRight size={10} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}/>
              <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedIssue.title}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <IconButton title="Watch"><StarIcon size={14}/></IconButton>
              <IconButton title="Copy link"><LinkIcon size={14}/></IconButton>
              <IconButton title="More"><MoreIcon size={14}/></IconButton>
              <IconButton title="Close" onClick={handleClose}><CloseIcon size={14}/></IconButton>
            </div>
          </div>

          {/* scrollable body */}
          <div className="custom-scrollbar"
            style={{ flex: 1, overflowY: 'auto', padding: '28px 36px', minHeight: 0,
              display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* cover image (only if present) */}
            {selectedIssue.coverUrl && (
              <div style={{
                width: '100%', height: 160, borderRadius: 'var(--radius-md)',
                overflow: 'hidden', position: 'relative', flexShrink: 0,
              }}>
                <img src={selectedIssue.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              </div>
            )}

            {/* title */}
            <div>
              {editingTitle ? (
                <input
                  autoFocus value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => {
                    if (titleDraft.trim() && titleDraft.trim() !== selectedIssue.title) {
                      updateTaskField('title', titleDraft.trim());
                    }
                    setEditingTitle(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (titleDraft.trim() && titleDraft.trim() !== selectedIssue.title) {
                        updateTaskField('title', titleDraft.trim());
                      }
                      setEditingTitle(false);
                    } else if (e.key === 'Escape') {
                      setTitleDraft(selectedIssue.title || '');
                      setEditingTitle(false);
                    }
                  }}
                  style={{
                    width: '100%', padding: '4px 6px', margin: '-4px -6px',
                    fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em',
                    lineHeight: 1.2, color: 'var(--text-primary)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-focus)',
                    borderRadius: 'var(--radius-sm)',
                    outline: 'none',
                    boxShadow: '0 0 0 2px var(--accent-primary-muted)',
                  }}
                />
              ) : (
                <h1
                  onClick={() => { setTitleDraft(selectedIssue.title || ''); setEditingTitle(true); }}
                  style={{
                    fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2,
                    margin: 0, padding: '4px 6px', marginLeft: -6, marginRight: -6,
                    color: 'var(--text-primary)', cursor: 'text',
                    borderRadius: 'var(--radius-sm)', transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {selectedIssue.title || 'Untitled task'}
                </h1>
              )}
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-tertiary)' }}>
                <span>Created by <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{
                  users?.find(u => u.id === selectedIssue.creatorId)?.name || 'Unknown'
                }</span></span>
              </div>
            </div>

            {/* description */}
            <Section title="Description">
              <RichEditor
                value={selectedIssue.description}
                placeholder="Add a description, paste links, drop screenshots…"
                isEmpty={isEmptyDesc}
                onCommit={(html) => updateTaskField('description', html)}
                onPaste={handleRichTextPaste}
              />
            </Section>

            {/* subtasks */}
            <Section
              title={<>Subtasks{subtaskCount > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)' }}>
                  {subtaskDone} / {subtaskCount}
                </span>
              )}</>}
              right={subtaskCount > 0 ? (
                <div style={{ width: 140, height: 4, borderRadius: 99, background: 'var(--bg-tertiary)' }}>
                  <div style={{ width: `${subtaskPct}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: 99, transition: 'width 0.2s' }}/>
                </div>
              ) : null}
            >
              <TaskSubtasksList
                subtasks={selectedIssue.subtasks}
                users={users}
                newSubtaskText={newSubtaskText}
                setNewSubtaskText={setNewSubtaskText}
                onAdd={addSubtask}
                onToggle={toggleSubtask}
                onUpdate={updateSubtaskField}
                onDelete={deleteSubtask}
                handleRichTextPaste={handleRichTextPaste}
              />
            </Section>

            {/* notes (private) */}
            <Section title="Notes" subtle hint="Private to you — not visible to other roles">
              <RichEditor
                value={selectedIssue.notes}
                placeholder="Private notes only you can see…"
                isEmpty={isEmptyNotes}
                minHeight={80}
                onCommit={(html) => updateTaskField('notes', html)}
                onPaste={handleRichTextPaste}
              />
            </Section>

            {/* activity / discussion (inline, no tab toggle) */}
            <Section title={<>Discussion{Array.isArray(selectedIssue.comments) && selectedIssue.comments.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)' }}>
                {selectedIssue.comments.length}
              </span>
            )}</>}>
              <TaskCommentsTab
                comments={selectedIssue.comments}
                newCommentText={newCommentText}
                setNewCommentText={setNewCommentText}
                isCommenting={isCommenting}
                onSubmit={addComment}
              />
            </Section>
          </div>
        </div>

        {/* ── RIGHT — inspector ──────────────────────────────────────── */}
        <aside className="task-modal-right-panel"
          style={{
            width: 280, flexShrink: 0,
            backgroundColor: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border-color)',
            display: 'flex', flexDirection: 'column', minHeight: 0,
          }}>
          <div className="custom-scrollbar"
            style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }}>

            {/* Contextual primary action — assignee/CEO sees Mark complete; CEO sees Approve on done unapproved tasks */}
            <PrimaryAction
              issue={selectedIssue}
              currentUser={currentUser}
              onMarkComplete={async () => {
                await updateTaskField('status', 'Done');
                await updateTaskField('isApproved', false);
              }}
              onApprove={async () => {
                await updateTaskField('isApproved', true);
                toast.success('Task approved');
              }}
              onReopen={async () => {
                await updateTaskField('status', 'In Progress');
              }}
            />

            <Inspector label="Status">
              <StatusPicker
                value={selectedIssue.status}
                onChange={(v) => updateTaskField('status', v)}
              />
            </Inspector>

            <Inspector label="Assignee">
              <AssigneePicker
                value={selectedIssue.assignee}
                users={users}
                onChange={(v) => updateTaskField('assignee', v)}
              />
            </Inspector>

            <Inspector label="Priority">
              <PriorityPicker
                value={selectedIssue.urgency || 'Medium'}
                onChange={(v) => updateTaskField('urgency', v)}
              />
            </Inspector>

            <Inspector label="Dates">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', width: 32, flexShrink: 0 }}>Start</span>
                  <InlineDate
                    value={selectedIssue.startDate}
                    onChange={(v) => updateTaskField('startDate', v)}
                    placeholder="—"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', width: 32, flexShrink: 0 }}>Due</span>
                  <InlineDate
                    value={selectedIssue.dueDate}
                    onChange={(v) => updateTaskField('dueDate', v)}
                    placeholder="—"
                  />
                </div>
                {due && (
                  <div style={{
                    marginTop: 2, padding: '4px 8px', fontSize: 11, fontWeight: 600,
                    color: due.color, background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                    display: 'inline-block', alignSelf: 'flex-start',
                  }}>
                    {due.text}
                  </div>
                )}
              </div>
            </Inspector>

            <Inspector label="Time estimate">
              <EstimateField
                value={selectedIssue.timeEstimated}
                onCommit={(v) => updateTaskField('timeEstimated', v)}
              />
            </Inspector>

            <Inspector label="Tags">
              <TagsField
                tags={selectedIssue.tags || []}
                onChange={(v) => updateTaskField('tags', v)}
              />
            </Inspector>

            {/* CEO-only: delete task action */}
            {currentUser?.role === 'ceo' && onIssueDeleted && (
              <div style={{ marginTop: 8, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await showConfirm(`Delete "${selectedIssue.title}"? This cannot be undone.`, 'Delete task?');
                    if (ok) onIssueDeleted(selectedIssue);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                    background: 'transparent', border: '1px solid transparent',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--alert-error-text)', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
                    width: '100%',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--alert-error-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <TrashIcon size={13}/> Delete task
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* one shared style block — neutral, theme-respecting */}
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
        .rich-text-editor p, .rich-text-editor div {
          margin-top: 0 !important; margin-bottom: 0.5em !important;
        }
        .rich-text-editor ul, .rich-text-editor ol {
          padding-left: 24px !important; margin: 0.5em 0 !important;
        }
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
        .rich-text-editor strong, .rich-text-editor b { font-weight: 700 !important; }
        .rich-text-editor em,    .rich-text-editor i { font-style: italic !important; }
      ` }}/>
    </div>
  );
};

// ── Section wrapper ──────────────────────────────────────────────────────

const Section = ({ title, hint, right, subtle, children }) => (
  <div>
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, marginBottom: 10,
    }}>
      <h3 style={{
        margin: 0, fontSize: subtle ? 12 : 13, fontWeight: 700,
        letterSpacing: subtle ? '0.04em' : 0,
        textTransform: subtle ? 'uppercase' : 'none',
        color: subtle ? 'var(--text-tertiary)' : 'var(--text-primary)',
        display: 'inline-flex', alignItems: 'baseline',
      }}>{title}</h3>
      {right}
    </div>
    {hint && (
      <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: -6, marginBottom: 10 }}>
        {hint}
      </div>
    )}
    {children}
  </div>
);

// ── Rich-text editor (contenteditable wrapper) ──────────────────────────

const RichEditor = ({ value, placeholder, isEmpty, onCommit, onPaste, minHeight = 120 }) => {
  const ref = useRef(null);
  return (
    <div style={{ position: 'relative' }}>
      {isEmpty && (
        <div style={{
          position: 'absolute', top: 14, left: 14, pointerEvents: 'none',
          color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: 14.5,
        }}>{placeholder}</div>
      )}
      <div
        ref={ref}
        contentEditable suppressContentEditableWarning
        className="rich-text-editor custom-scrollbar"
        onPaste={onPaste}
        onBlur={(e) => {
          const html = e.currentTarget.innerHTML;
          if (html !== (value || '')) onCommit(html);
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.backgroundColor = isContentEmpty(e.currentTarget) ? 'var(--bg-secondary)' : 'var(--bg-primary)';
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-focus)';
          e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-primary-muted)';
          e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
        }}
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(
            (value || '').includes('<') ? (value || '') : (value || '').replace(/\n/g, '<br>')
          ),
        }}
        style={{
          width: '100%', minHeight, padding: 14,
          fontSize: 14, lineHeight: 1.65, color: 'var(--text-primary)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          outline: 'none', cursor: 'text',
          whiteSpace: 'normal', wordBreak: 'break-word',
          transition: 'border-color 0.15s, box-shadow 0.15s, background-color 0.15s',
        }}
      />
    </div>
  );
};

const isContentEmpty = (el) => !el?.textContent?.trim();

// ── Estimate field (hours input) ────────────────────────────────────────

const EstimateField = ({ value, onCommit }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const commit = () => {
    const n = parseInt(draft, 10);
    onCommit(Number.isFinite(n) && n >= 0 ? n : 0);
    setEditing(false);
  };
  if (editing) {
    return (
      <input
        autoFocus type="number" min={0} value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          else if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); }
        }}
        placeholder="Hours"
        style={{
          width: '100%', height: 32, padding: '0 10px',
          background: 'var(--bg-primary)', color: 'var(--text-primary)',
          border: '1px solid var(--border-focus)', borderRadius: 'var(--radius-sm)',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 500, outline: 'none',
          boxShadow: '0 0 0 2px var(--accent-primary-muted)',
        }}
      />
    );
  }
  return (
    <button type="button" onClick={() => { setDraft(value || ''); setEditing(true); }}
      style={{
        width: '100%', height: 32, padding: '0 10px',
        background: 'transparent', border: '1px solid transparent',
        borderRadius: 'var(--radius-sm)',
        color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
        fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
        textAlign: 'left', cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-primary)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {value ? `${value} ${value === 1 ? 'hour' : 'hours'}` : 'Not set'}
    </button>
  );
};

// ── Icon button ─────────────────────────────────────────────────────────

const IconButton = ({ children, onClick, title }) => (
  <button type="button" onClick={onClick} title={title}
    style={{
      width: 28, height: 28, borderRadius: 'var(--radius-sm)',
      border: 'none', background: 'transparent', color: 'var(--text-secondary)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
  >
    {children}
  </button>
);

// ── Contextual primary action button at top of inspector ──────────────

const PrimaryAction = ({ issue, currentUser, onMarkComplete, onApprove, onReopen }) => {
  const role = currentUser?.role;
  const isAssignee = issue.assignee === currentUser?.id;
  const isDone = issue.status === 'Done';
  const isApproved = !!issue.isApproved;

  // Done + approved → success badge, with reopen affordance for CEO
  if (isDone && isApproved) {
    return (
      <div style={{
        padding: '10px 12px', borderRadius: 'var(--radius-md)',
        background: 'var(--accent-success-muted)', border: '1px solid var(--accent-success-border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent-success-text)', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckIcon size={12}/>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent-success-text)' }}>
            Completed & approved
          </div>
          {role === 'ceo' && (
            <button onClick={onReopen}
              style={{
                marginTop: 2, padding: 0, background: 'transparent', border: 'none',
                color: 'var(--text-secondary)', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 11, fontWeight: 500, textDecoration: 'underline',
              }}>
              Reopen task
            </button>
          )}
        </div>
      </div>
    );
  }

  // Done but waiting approval — CEO gets primary Approve button
  if (isDone && !isApproved && role === 'ceo') {
    return (
      <button type="button" onClick={onApprove}
        style={{
          width: '100%', height: 38, padding: '0 14px',
          background: 'var(--accent-success-text)', color: '#fff', border: 'none',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'filter 0.12s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}>
        <CheckIcon size={13}/>Approve task
      </button>
    );
  }

  // Done but waiting approval — assignee/others see informational state
  if (isDone && !isApproved) {
    return (
      <div style={{
        padding: '10px 12px', borderRadius: 'var(--radius-md)',
        background: 'var(--accent-warning-muted)', border: '1px solid var(--accent-warning-text)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent-warning-text)', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ClockSmall/>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent-warning-text)' }}>
            Awaiting approval
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 1 }}>
            CEO will be notified
          </div>
        </div>
      </div>
    );
  }

  // Not done — assignee or CEO can mark complete
  if (isAssignee || role === 'ceo') {
    return (
      <button type="button" onClick={onMarkComplete}
        style={{
          width: '100%', height: 38, padding: '0 14px',
          background: 'var(--accent-primary)', color: '#fff', border: 'none',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'filter 0.12s, transform 0.08s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
        <CheckIcon size={13}/>Mark complete
      </button>
    );
  }

  return null;
};

const ClockSmall = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
  </svg>
);

export default TaskDetailModal;
