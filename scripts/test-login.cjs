const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rnpjhcrmexmopbulgozw.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) { console.error('Set SUPABASE_SERVICE_ROLE_KEY env var. Find it in Supabase Dashboard → Settings → API.'); process.exit(1); }

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const TEST_USER_ID = process.env.TEST_USER_ID;
  const TEST_EMAIL = process.env.TEST_EMAIL;
  const TEST_PASSWORD = process.env.TEST_PASSWORD;
  if (!TEST_USER_ID || !TEST_EMAIL || !TEST_PASSWORD) {
    console.error('Set TEST_USER_ID, TEST_EMAIL, TEST_PASSWORD env vars to run this test.');
    process.exit(1);
  }

  // Inspect user details first
  const { data: userData } = await admin.auth.admin.getUserById(TEST_USER_ID);
  console.log('User details:');
  console.log('  Email:', userData.user.email);
  console.log('  Email confirmed:', userData.user.email_confirmed_at);
  console.log('  Banned:', userData.user.banned_until);
  console.log('  Last sign in:', userData.user.last_sign_in_at);
  console.log('  Identities:', userData.user.identities?.map(i => i.provider).join(', '));

  console.log('\nAttempting sign-in...');
  const { data, error } = await admin.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });
  if (error) {
    console.error('Sign-in error:', error);
  } else {
    console.log('Sign-in SUCCESS!');
    console.log('  Session user:', data.user.email);
  }
}

main().catch(console.error);
