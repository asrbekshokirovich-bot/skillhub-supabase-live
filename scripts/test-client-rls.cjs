// Tests whether the JS client respects RLS when signed in as different users
const { createClient } = require('@supabase/supabase-js');

const URL = 'https://rnpjhcrmexmopbulgozw.supabase.co';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE) { console.error('Set SUPABASE_SERVICE_ROLE_KEY env var. Find it in Supabase Dashboard → Settings → API.'); process.exit(1); }

(async () => {
  // Simulate what the running app does (it uses service_role as "anon key")
  const sb = createClient(URL, SERVICE_ROLE, { auth: { persistSession: false } });

  console.log('=== Signed-in WORKER trying to access projects ===');
  const { error: signInErr } = await sb.auth.signInWithPassword({
    email: 'worker_test@skillhubapp.com',
    password: 'temp_pw_check'
  });
  if (signInErr) {
    console.log('(worker_test password unknown, resetting to test_pw)');
    const admin = createClient(URL, SERVICE_ROLE);
    await admin.auth.admin.updateUserById('1af7ad23-10b6-4064-89eb-3383028d91c3', { password: 'test_pw_temp' });
    const { error: e2 } = await sb.auth.signInWithPassword({
      email: 'worker_test@skillhubapp.com', password: 'test_pw_temp'
    });
    if (e2) { console.error('Sign-in failed:', e2.message); process.exit(1); }
  }

  const { data: projects, error } = await sb.from('projects').select('id, title');
  if (error) console.error('Query error:', error);
  console.log(`  Projects visible to worker via JS client: ${projects?.length}`);
  if (projects?.length > 0) console.log(`  ⚠️  RLS BYPASSED — service_role key in client makes RLS useless`);
  else console.log(`  ✅ RLS enforced — worker sees no projects`);

  const { data: creds } = await sb.from('credentials').select('id');
  console.log(`  Credentials visible to worker: ${creds?.length ?? 0}`);
})();
