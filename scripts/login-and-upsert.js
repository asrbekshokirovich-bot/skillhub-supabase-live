import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const username = 'owner';
  const password = 'OwnerPassword123!';
  const email = `${username}@skillhubapp.com`;

  console.log("Logging in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error("Login Error:", authError);
    return;
  }

  const userId = authData.user.id;
  console.log("Logged in as:", userId);

  console.log("Attempting to insert/upsert into users table...");
  const { error } = await supabase.from('users').upsert({
    id: userId,
    email,
    name: username,
    role: 'admin'
  });

  if (error) {
    console.error("Upsert Error:", error);
  } else {
    console.log("Upsert Success!");
  }
}
run();
