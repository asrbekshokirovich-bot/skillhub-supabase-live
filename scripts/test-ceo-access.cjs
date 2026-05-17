const { createClient } = require('@supabase/supabase-js');

const URL = 'https://rnpjhcrmexmopbulgozw.supabase.co';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE) { console.error('Set SUPABASE_SERVICE_ROLE_KEY env var. Find it in Supabase Dashboard → Settings → API.'); process.exit(1); }

(async () => {
  const sb = createClient(URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const CEO_EMAIL = process.env.CEO_EMAIL;
  const CEO_PASSWORD = process.env.CEO_PASSWORD;
  if (!CEO_EMAIL || !CEO_PASSWORD) {
    console.error('Set CEO_EMAIL and CEO_PASSWORD env vars to run this test.');
    process.exit(1);
  }
  const { error: e } = await sb.auth.signInWithPassword({
    email: CEO_EMAIL, password: CEO_PASSWORD
  });
  if (e) { console.error('CEO sign-in failed:', e.message); process.exit(1); }

  const { data: projects } = await sb.from('projects').select('id, title');
  console.log(`CEO Davrbek sees ${projects?.length} projects (should be 6)`);
  projects?.forEach(p => console.log(`  - ${p.title}`));

  const { data: tasks } = await sb.from('tasks').select('id');
  console.log(`CEO sees ${tasks?.length} tasks (should be 43)`);

  const { data: creds } = await sb.from('credentials').select('id');
  console.log(`CEO sees ${creds?.length} credentials (should be 0, table empty)`);
})();
