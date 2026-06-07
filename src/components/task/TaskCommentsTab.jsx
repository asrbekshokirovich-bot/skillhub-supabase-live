import React from 'react';
import { Send } from 'lucide-react';

// Render comment text with @mentions highlighted as chips
const renderCommentWithMentions = (text) => {
  if (!text) return null;
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} style={{
          color: 'var(--accent-primary-text)',
          background: 'var(--accent-primary-muted)',
          padding: '1px 6px', borderRadius: 4,
          fontWeight: 600, fontSize: '0.875em',
        }}>{part}</span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

const formatChatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const y = new Date(now); y.setDate(y.getDate() - 1);
  const isYesterday = date.toDateString() === y.toDateString();
  const t = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return t;
  if (isYesterday) return `Yesterday, ${t}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${t}`;
};

export default function TaskCommentsTab({
  comments = [],
  newCommentText,
  setNewCommentText,
  isCommenting,
  onSubmit,
}) {
  const list = Array.isArray(comments) ? comments : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* MESSAGE LIST */}
      <div className="custom-scrollbar"
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem', padding: '2rem 0' }}>
            No comments yet. Tip: type <span style={{ color: 'var(--accent-primary-text)', fontWeight: 600 }}>@name</span> to notify a teammate.
          </div>
        ) : (
          list.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Avatar name={c.author} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.author}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, flexShrink: 0 }}>{formatChatTime(c.createdAt || c.timestamp)}</span>
                  {Array.isArray(c.mentions) && c.mentions.length > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--accent-primary-text)', fontWeight: 600 }}>
                      · mentioned {c.mentions.length}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5, wordBreak: 'break-word',
                  backgroundColor: 'var(--bg-tertiary)', padding: '10px 16px',
                  borderRadius: 16, borderTopLeftRadius: 4,
                  border: '1px solid var(--border-color)',
                }}>
                  {renderCommentWithMentions(c.text)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* INPUT */}
      <div style={{ padding: 16, backgroundColor: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)' }}>
        <form onSubmit={onSubmit} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, position: 'relative' }}>
          <textarea
            value={newCommentText}
            onChange={e => setNewCommentText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(e); } }}
            className="custom-scrollbar"
            placeholder="Write a comment… (use @name to mention)"
            rows={1}
            style={{
              width: '100%', padding: '12px 48px 12px 16px',
              fontSize: 14,
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 16, resize: 'none',
              minHeight: 44, maxHeight: 120, outline: 'none',
              transition: 'border-color 120ms',
              fontFamily: 'inherit',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
          />
          <button
            type="submit"
            disabled={isCommenting || !newCommentText.trim()}
            title="Send comment"
            style={{
              position: 'absolute', right: 8, bottom: 8,
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: (!newCommentText.trim() || isCommenting) ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
              color: (!newCommentText.trim() || isCommenting) ? 'var(--text-tertiary)' : 'var(--text-primary)',
              borderRadius: 12, border: 'none',
              cursor: (!newCommentText.trim() || isCommenting) ? 'default' : 'pointer',
              transition: 'background-color 120ms',
            }}
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}

const Avatar = ({ name = '?' }) => (
  <div style={{
    width: 32, height: 32, borderRadius: '50%',
    background: 'var(--accent-primary-muted)',
    color: 'var(--accent-primary-text)',
    border: '1px solid var(--accent-primary-border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, flexShrink: 0, textTransform: 'uppercase',
  }}>
    {name.charAt(0).toUpperCase()}
  </div>
);
