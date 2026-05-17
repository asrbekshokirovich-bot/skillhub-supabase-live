import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are missing');
}

// Supabase-js v2 uses navigator.locks to coordinate token refresh across tabs.
// In dev (Vite HMR) and when multiple tabs are open, the lock can get held
// indefinitely and `auth.getSession()` then hangs forever, which freezes the
// app on its initial loading spinner. We pass a no-op lock to bypass this —
// safe for a single-tab CRM that doesn't actually need cross-tab refresh
// coordination.
const noopLock = async (_key, _timeout, fn) => fn();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: noopLock,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
