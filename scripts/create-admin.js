import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const username = 'owner';
  const password = 'OwnerPassword123!';
  const email = `${username}@skillhubapp.com`;

  console.log("Signing up new owner account...");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("Signup Error:", error.message);
    // If it says user already registered, try signing in to get the ID, or just insert
    if (error.message.includes('User already registered')) {
        console.log("User already exists, attempting login to get ID...");
        const loginData = await supabase.auth.signInWithPassword({ email, password });
        if (loginData.error) {
            console.error("Login Error:", loginData.error);
            return;
        }
        const userId = loginData.data.user.id;
        // update role to admin
        const updateData = await supabase.from('users').upsert({
            id: userId,
            email,
            name: username,
            role: 'admin'
        });
        console.log("Upserted user table:", updateData.error || "Success");
        return;
    }
    return;
  }

  const userId = data.user.id;
  console.log("Auth user created with ID:", userId);

  console.log("Inserting into users table with 'admin' role...");
  const { error: profileError } = await supabase.from('users').insert({
    id: userId,
    email,
    name: username,
    role: 'admin'
  });

  if (profileError) {
    console.error("Profile Error:", profileError);
  } else {
    console.log(`Success! Created owner account: username: '${username}', password: '${password}'`);
  }
}
run();
