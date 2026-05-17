const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rnpjhcrmexmopbulgozw.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) { console.error('Set SUPABASE_SERVICE_ROLE_KEY env var. Find it in Supabase Dashboard → Settings → API.'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const USER_ID = process.env.RESET_USER_ID;
const NEW_PASSWORD = process.env.RESET_PASSWORD;
if (!USER_ID || !NEW_PASSWORD) {
  console.error('Usage: RESET_USER_ID=<uuid> RESET_PASSWORD=<new-pw> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/reset-password.cjs');
  process.exit(1);
}

async function main() {
  const { data, error } = await supabase.auth.admin.updateUserById(USER_ID, {
    password: NEW_PASSWORD
  });
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  console.log('Password updated successfully for:', data.user.email);
  console.log('User ID:', data.user.id);
}

main().catch(console.error);
