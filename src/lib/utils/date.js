// Shared date utilities. Use these instead of duplicating logic across pages.

export const TODAY_ISO = () => new Date().toISOString().slice(0, 10);

/**
 * Mask user input into DD/MM/YYYY format as they type.
 * Strips non-digits, caps at 8 digits, inserts slashes at positions 2 and 5.
 * Used by date <input type="text"> fields to enforce a date-shaped value.
 */
export const maskDateInput = (raw) => {
  if (!raw) return '';
  let val = raw.replace(/\D/g, '');
  if (val.length > 8) val = val.substring(0, 8);
  if (val.length > 4) return `${val.substring(0, 2)}/${val.substring(2, 4)}/${val.substring(4)}`;
  if (val.length > 2) return `${val.substring(0, 2)}/${val.substring(2)}`;
  return val;
};

/**
 * Parse a DD/MM/YYYY string into a full ISO timestamp at local midnight.
 * Throws if input doesn't match the expected shape.
 */
export const parseDDMMYYYYtoISO = (str) => {
  if (!str || str.length !== 10) throw new Error('Invalid date length');
  const [dd, mm, yyyy] = str.split('/');
  if (!dd || !mm || !yyyy) throw new Error('Invalid date format');
  const date = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10), 0, 0, 0);
  if (isNaN(date.getTime())) throw new Error('Invalid date');
  return date.toISOString();
};

/**
 * Format an ISO date (YYYY-MM-DD) or Date as DD/MM/YYYY.
 * Returns empty string for falsy inputs.
 */
export const formatToDateMask = (iso) => {
  if (!iso) return '';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d)) return String(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

/**
 * Format an ISO date as "May 17, 2026".
 */
export const formatLongDate = (iso) => {
  if (!iso) return '—';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Format an ISO date as "May 17" (no year).
 */
export const formatShortDate = (iso) => {
  if (!iso) return '—';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Days since (positive) or until (negative) a given ISO date.
 */
export const daysFromToday = (iso) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

/**
 * Is the given ISO date strictly before today (overdue)?
 */
export const isOverdue = (iso) => {
  if (!iso) return false;
  return iso < TODAY_ISO();
};

/**
 * Format a date for chat-style display: today shows time only, yesterday shows "Yesterday, HH:MM",
 * older shows "Mon DD, HH:MM".
 */
export const formatChatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const y = new Date(now); y.setDate(y.getDate() - 1);
  const isYesterday = d.toDateString() === y.toDateString();
  const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return t;
  if (isYesterday) return `Yesterday, ${t}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${t}`;
};
