import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rnpjhcrmexmopbulgozw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucGpoY3JtZXhtb3BidWxnb3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjg3MTAsImV4cCI6MjA4ODcwNDcxMH0.9sQpjfpOFs387CI3kj7hlM8dXeh_HAZYD4PeRup5fDM";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTrigger() {
  const username = "triggerTest_" + Date.now();
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
  
  const userId = data.user.id;
  console.log("Secondary user created! ID:", userId);
  
  // Wait a second for the trigger to fire
  await new Promise(r => setTimeout(r, 1000));
  
  // Query the users table
  const { data: userData, error: fetchError } = await supabase.from('users').select('*').eq('id', userId).single();
  
  if (fetchError) {
    console.error("Failed to fetch user from users table:", fetchError.message);
  } else {
    console.log("SUCCESS! The trigger worked. User found in public.users:", userData);
  }
}

testTrigger();
