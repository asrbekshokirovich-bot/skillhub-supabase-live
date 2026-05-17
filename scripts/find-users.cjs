const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rnpjhcrmexmopbulgozw.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) { console.error('Set SUPABASE_SERVICE_ROLE_KEY env var. Find it in Supabase Dashboard → Settings → API.'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('=== Auth Users ===');
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Auth error:', authError);
  } else {
    authData.users.forEach(u => {
      console.log(`ID: ${u.id} | Email: ${u.email} | Created: ${u.created_at}`);
    });
  }

  console.log('\n=== Public Users (with roles) ===');
  const { data: profiles, error: profilesError } = await supabase
    .from('users')
    .select('id, email, name, role, "createdAt"');
  if (profilesError) {
    console.error('Profiles error:', profilesError);
  } else {
    profiles.forEach(p => {
      console.log(`Name: ${p.name} | Email: ${p.email} | Role: ${p.role} | ID: ${p.id}`);
    });
  }
}

main().catch(console.error);
