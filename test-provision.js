import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rnpjhcrmexmopbulgozw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucGpoY3JtZXhtb3BidWxnb3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjg3MTAsImV4cCI6MjA4ODcwNDcxMH0.9sQpjfpOFs387CI3kj7hlM8dXeh_HAZYD4PeRup5fDM";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProvisioning() {
  const username = "newworker" + Date.now();
  const password = "password123";
  const role = "worker";
  const email = `${username}@skillhubapp.com`;

  console.log(`Provisioning user: ${username}`);
  
  // Create a secondary client exactly like Team.jsx does
  const secondarySupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const { data, error } = await secondarySupabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: username,
        role: role
      }
    }
  });

  if (error) {
    console.error("Failed to sign up secondary user:", error.message);
    return;
  }
  
  console.log("Secondary user created! ID:", data.user?.id);
  
  // Link profile data natively via Postgres (RLS might prevent this if we aren't logged in as Admin, but let's test if anon can insert, or if RLS handles it)
  const { error: profileError } = await supabase.from('users').insert({
    id: data.user.id,
    email,
    name: username,
    role: role
  });

  if (profileError) {
    console.error("Failed to insert into users table:", profileError.message);
  } else {
    console.log("Successfully inserted into users table!");
  }
}

testProvisioning();
