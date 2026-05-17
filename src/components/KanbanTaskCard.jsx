import React from 'react';
import { Trash2, CheckSquare, MessageSquare } from 'lucide-react';

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
};

const urgencyStyle = (urgency) => {
  switch (urgency) {
    case 'High':   return { background: 'var(--alert-error-bg)',      color: 'var(--alert-error-text)' };
    case 'Medium': return { background: 'var(--accent-warning-muted)', color: 'var(--accent-warning-text)' };
    default:       return { background: 'var(--accent-success-muted)', color: 'var(--accent-success-text)' };
  }
};

/**
 * One draggable card on the kanban. Pure rendering — all behavior comes from callbacks.
 *
 * Props:
 *   issue, column, users, currentUser
 *   draggableProps   — from react-beautiful-dnd Draggable
 *   isDragging
 *   onOpen           — () => void, fires on card click
 *   onDelete         — () => void, fires on delete button
 *   onApprove        — () => void, fires on approve button (Done + pending only)
 */
export default function KanbanTaskCard({
  issue, column, users = [], currentUser,
  draggableProps, dragHandleProps, innerRef, isDragging,
  onOpen, onDelete, onApprove,
}) {
  const assigneeName = (issue.assignee && issue.assignee !== 'Unassigned')
    ? (users.find(u => u.id === issue.assignee)?.name || issue.assignee)
    : null;

  const urgency = urgencyStyle(issue.urgency);
  const showApprove = column === 'Done' && !issue.isApproved && currentUser?.role === 'ceo';

  return (
    <div
      ref={innerRef}
      {...draggableProps}
      {...dragHandleProps}
      onClick={onOpen}
      className="card hover-elevate cursor-pointer"
      style={{
        ...draggableProps?.style,
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)',
        flexShrink: 0,
        opacity: isDragging ? 0.9 : 1,
        boxShadow: isDragging ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
      }}
    >
      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* TOP CHIPS + DELETE */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
            {column === 'Done' && !issue.isApproved && (
              <Chip bg="var(--accent-warning-muted)" color="var(--accent-warning-text)">Pending Approval</Chip>
            )}
            <Chip {...urgency}>{issue.urgency || 'Medium'}</Chip>
            {(issue.tags || []).slice(0, 2).map((tag, i) => (
              <span key={i} style={{
                fontSize: 10, padding: '0.2rem 0.5rem',
                backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                borderRadius: 4, fontWeight: 600, whiteSpace: 'nowrap',
              }}>{tag}</span>
            ))}
            {(issue.tags?.length || 0) > 2 && (
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600 }}>+{issue.tags.length - 2}</span>
            )}
          </div>

          {currentUser?.role === 'ceo' && onDelete && (
            <button
              className="p-1.5 rounded-md transition-all shrink-0 ml-2"
              style={{ color: 'var(--alert-error-text)', opacity: 0.6, background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'var(--alert-error-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Delete task"
            >
              <Trash2 size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* TITLE + DESCRIPTION */}
        <h4 style={{
          fontSize: '1rem', fontWeight: 600, lineHeight: 1.4,
          wordBreak: 'break-word', margin: '0 0 0.5rem 0',
          color: 'var(--text-primary)',
        }}>{issue.title}</h4>

        {issue.description && stripHtml(issue.description) && (
          <p style={{
            fontSize: '0.85rem', color: 'var(--text-secondary)',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', margin: '0 0 0.75rem 0',
            wordBreak: 'break-word', lineHeight: 1.5,
          }}>{stripHtml(issue.description)}</p>
        )}

        {issue.screenshotUrl && (
          <div style={{
            margin: '0 0 0.75rem 0', borderRadius: 6, overflow: 'hidden',
            border: '1px solid var(--border-color)', maxHeight: 100,
            backgroundColor: 'var(--bg-secondary)',
          }}>
            <img src={issue.screenshotUrl} alt="Attachment" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}

        {showApprove && (
          <button
            className="btn btn-primary w-full mt-2 mb-2"
            style={{
              padding: '0.5rem', fontSize: '0.85rem',
              backgroundColor: 'var(--accent-success)', border: 'none',
              color: '#fff',
            }}
            onClick={(e) => { e.stopPropagation(); onApprove?.(); }}
          >
            Approve task
          </button>
        )}
      </div>

      {/* FOOTER: assignee + stats */}
      <div style={{
        padding: '0.75rem 1.25rem', backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)',
      }}>
        <div className="flex items-center gap-2" title={assigneeName || 'Unassigned'}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            backgroundColor: assigneeName ? 'var(--accent-primary-muted)' : 'var(--bg-tertiary)',
            color: assigneeName ? 'var(--accent-primary-text)' : 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', flexShrink: 0,
            border: assigneeName ? '1px solid var(--accent-primary-border)' : '1px solid var(--border-color)',
          }}>
            {String(assigneeName || '?').charAt(0)}
          </div>
          <span style={{
            fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)',
            maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{String(assigneeName || 'Unassigned').split(' ')[0]}</span>
        </div>

        <div className="flex items-center" style={{ gap: 12 }}>
          {Array.isArray(issue.subtasks) && issue.subtasks.length > 0 && (
            <Stat icon={<CheckSquare size={14} strokeWidth={2.5} />} text={`${issue.subtasks.filter(s => s?.completed).length}/${issue.subtasks.length}`} title="Subtasks" />
          )}
          <Stat icon={<MessageSquare size={14} strokeWidth={2.5} />} text={Array.isArray(issue.comments) ? issue.comments.length : 0} title="Comments" />
        </div>
      </div>
    </div>
  );
}

const Chip = ({ children, bg, background, color }) => (
  <span style={{
    fontSize: 10, fontWeight: 700,
    padding: '0.2rem 0.5rem', borderRadius: 4,
    textTransform: 'uppercase', letterSpacing: '0.02em',
    flexShrink: 0,
    backgroundColor: bg || background, color,
  }}>{children}</span>
);

const Stat = ({ icon, text, title }) => (
  <div className="flex items-center" style={{ gap: 4, color: 'var(--text-secondary)' }} title={title}>
    {React.cloneElement(icon, { style: { color: 'var(--text-secondary)' } })}
    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{text}</span>
  </div>
);
