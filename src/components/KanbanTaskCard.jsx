// ─────────────────────────────────────────────────────────────────────────
// KanbanTaskCard — tightened density, subtler priority chip, due-date pill.
//
// Drop-in replacement for src/components/KanbanTaskCard.jsx.
// Same props, same imports, same downstream behavior.
//
// Visible changes:
//   • Priority renders as a small dot + label instead of a loud uppercase
//     chip — quieter visual weight, same information.
//   • Due-date pill on the footer (e.g. "Due May 20 · 3d", "Overdue 1d")
//     surfaces urgency without you opening the card.
//   • Hover state matches the rest of the V2 system (subtle border shift +
//     small elevation, no scale).
//   • Strict CSS variables — no hard-coded indigo/blue.
// ─────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Trash2, CheckSquare, MessageSquare, Calendar } from 'lucide-react';

const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .trim();
};

const priorityDot = (urgency) => {
  switch (urgency) {
    case 'High':   return 'var(--alert-error-text)';
    case 'Medium': return 'var(--accent-warning)';
    default:       return 'var(--text-tertiary)';
  }
};

// Returns { text, color } describing how the due date sits relative to today.
const dueLabel = (dueDate) => {
  if (!dueDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / 86400000);
  const formatted = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (diff < 0)   return { text: `Overdue ${Math.abs(diff)}d`, color: 'var(--alert-error-text)', bg: 'var(--alert-error-bg)', border: 'var(--alert-error-border)' };
  if (diff === 0) return { text: 'Due today',                  color: 'var(--accent-warning-text)', bg: 'var(--accent-warning-muted)', border: 'var(--accent-warning-text)' };
  if (diff <= 3)  return { text: `${formatted} · ${diff}d`,    color: 'var(--accent-warning-text)', bg: 'var(--accent-warning-muted)', border: 'var(--accent-warning-text)' };
  return { text: formatted, color: 'var(--text-secondary)', bg: 'transparent', border: 'transparent' };
};

export default function KanbanTaskCard({
  issue, column, users = [], currentUser,
  draggableProps, dragHandleProps, innerRef, isDragging,
  onOpen, onDelete, onApprove,
}) {
  const assigneeUser = (issue.assignee && issue.assignee !== 'Unassigned')
    ? (users.find(u => u.id === issue.assignee) || null)
    : null;
  const assigneeName = assigneeUser?.name || (issue.assignee !== 'Unassigned' ? issue.assignee : null);

  const due = dueLabel(issue.dueDate);
  const showApprove = column === 'Done' && !issue.isApproved && currentUser?.role === 'ceo';
  const pendingApproval = column === 'Done' && !issue.isApproved;
  const descText = issue.description ? stripHtml(issue.description) : '';

  return (
    <div
      ref={innerRef}
      {...draggableProps}
      {...dragHandleProps}
      onClick={onOpen}
      className="kanban-card cursor-pointer"
      style={{
        ...draggableProps?.style,
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)',
        border: `1px solid ${isDragging ? 'var(--border-focus)' : 'var(--border-color)'}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: isDragging ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        overflow: 'hidden', flexShrink: 0,
        opacity: isDragging ? 0.95 : 1,
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
      }}
    >
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {/* COVER IMAGE (if set) — shown at top, edge to edge minus card padding */}
        {issue.coverUrl && (
          <div style={{
            margin: '-12px -14px 0', borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)', overflow: 'hidden',
            aspectRatio: '16 / 7',
          }}>
            <img src={issue.coverUrl} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
          </div>
        )}

        {/* TOP ROW: pills + delete */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, minWidth: 0 }}>
            {pendingApproval && (
              <Chip bg="var(--accent-warning-muted)" color="var(--accent-warning-text)" border="var(--accent-warning-text)">
                Pending approval
              </Chip>
            )}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: priorityDot(issue.urgency), flexShrink: 0,
              }}/>
              {issue.urgency || 'Medium'}
            </span>
            {(issue.tags || []).slice(0, 2).map((tag, i) => (
              <span key={i} style={{
                fontSize: 10.5, padding: '1px 6px', borderRadius: 4,
                background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                fontWeight: 600, whiteSpace: 'nowrap',
              }}>{tag}</span>
            ))}
            {(issue.tags?.length || 0) > 2 && (
              <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 600 }}>
                +{issue.tags.length - 2}
              </span>
            )}
          </div>

          {currentUser?.role === 'ceo' && onDelete && (
            <button
              type="button" title="Delete task"
              className="kanban-card-delete"
              style={{
                width: 24, height: 24, padding: 0, borderRadius: 6,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--alert-error-text)', opacity: 0.55,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'opacity 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.backgroundColor = 'var(--alert-error-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.55';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 size={14} strokeWidth={2}/>
            </button>
          )}
        </div>

        {/* TITLE */}
        <h4 style={{
          margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.4,
          letterSpacing: '-0.005em', color: 'var(--text-primary)',
          wordBreak: 'break-word',
        }}>
          {issue.title}
        </h4>

        {/* DESCRIPTION (clamped) */}
        {descText && (
          <p style={{
            margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', wordBreak: 'break-word',
          }}>
            {descText}
          </p>
        )}

        {/* SCREENSHOT THUMBNAIL */}
        {issue.screenshotUrl && (
          <div style={{
            marginTop: 2, borderRadius: 'var(--radius-sm)', overflow: 'hidden',
            border: '1px solid var(--border-color)', maxHeight: 96,
            background: 'var(--bg-secondary)',
          }}>
            <img src={issue.screenshotUrl} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
          </div>
        )}

        {/* CEO-only approve CTA */}
        {showApprove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onApprove?.(); }}
            style={{
              width: '100%', marginTop: 2, height: 32, padding: '0 12px',
              background: 'var(--accent-success)', color: '#fff', border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'filter 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
          >
            Approve task
          </button>
        )}
      </div>

      {/* FOOTER: assignee + stats + due */}
      <div style={{
        padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}
          title={assigneeName || 'Unassigned'}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: assigneeName ? 'var(--accent-primary-muted)' : 'var(--bg-tertiary)',
            color: assigneeName ? 'var(--accent-primary-text)' : 'var(--text-tertiary)',
            border: `1px solid ${assigneeName ? 'var(--accent-primary-border)' : 'var(--border-color)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', flexShrink: 0,
          }}>
            {String(assigneeName || '?').charAt(0)}
          </div>
          <span style={{
            fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
            maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {String(assigneeName || 'Unassigned').split(' ')[0]}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
          {due && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: due.bg === 'transparent' ? 0 : '2px 7px',
              borderRadius: 99,
              background: due.bg, border: due.border === 'transparent' ? 'none' : `1px solid ${due.border}`,
              color: due.color, fontSize: 11, fontWeight: 600,
            }}>
              <Calendar size={11} strokeWidth={2.4}/>
              {due.text}
            </span>
          )}
          {Array.isArray(issue.subtasks) && issue.subtasks.length > 0 && (
            <Stat
              icon={<CheckSquare size={12} strokeWidth={2.4}/>}
              text={`${issue.subtasks.filter(s => s?.completed).length}/${issue.subtasks.length}`}
              title="Subtasks"
            />
          )}
          {Array.isArray(issue.comments) && issue.comments.length > 0 && (
            <Stat
              icon={<MessageSquare size={12} strokeWidth={2.4}/>}
              text={issue.comments.length}
              title="Comments"
            />
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .kanban-card:hover {
          border-color: var(--text-tertiary) !important;
          box-shadow: var(--shadow-md) !important;
          transform: translateY(-1px);
        }
      ` }}/>
    </div>
  );
}

const Chip = ({ children, bg, color, border }) => (
  <span style={{
    fontSize: 10, fontWeight: 700, padding: '1px 6px',
    borderRadius: 4, letterSpacing: '0.02em',
    textTransform: 'uppercase', flexShrink: 0,
    background: bg, color, border: border ? `1px solid ${border}` : 'none',
  }}>{children}</span>
);

const Stat = ({ icon, text, title }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)',
  }} title={title}>
    {icon}{text}
  </span>
);
