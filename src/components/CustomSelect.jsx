import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

// Custom form dropdown (DESIGN_SPEC §4) — a token-styled replacement for the
// native <select>, so the OS-blue dropdown never appears (Hard Rule #2).
// Trigger mirrors the `.input` control; the popover is a list of rows with the
// selected row filled in `--bg-secondary` + a salmon check. Closes on Esc /
// outside-click. Drop-in: pass value, onChange(value), options [{value,label}].
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  disabled = false,
  style,
  buttonStyle,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => String(o.value) === String(value));

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
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        className="input"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, textAlign: 'left', fontFamily: 'inherit',
          cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
          ...buttonStyle,
        }}
      >
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: selected ? 'var(--text-primary)' : 'var(--text-tertiary)',
        }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
      </button>

      {open && (
        <div
          role="listbox"
          className="custom-scrollbar animate-fade-in"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60,
            maxHeight: 240, overflowY: 'auto', padding: 4,
            borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)',
          }}
        >
          {options.map(opt => {
            const isSel = String(opt.value) === String(value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={isSel}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  width: '100%', textAlign: 'left', padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                  background: isSel ? 'var(--bg-secondary)' : 'transparent',
                  color: 'var(--text-primary)', fontSize: 14, fontWeight: isSel ? 600 : 500,
                  fontFamily: 'inherit', transition: 'background 120ms',
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
}
