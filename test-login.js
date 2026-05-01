import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rnpjhcrmexmopbulgozw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucGpoY3JtZXhtb3BidWxnb3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjg3MTAsImV4cCI6MjA4ODcwNDcxMH0.9sQpjfpOFs387CI3kj7hlM8dXeh_HAZYD4PeRup5fDM";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignupAndLogin() {
  const email = `testuser_${Date.now()}@skillhubapp.com`;
  const password = "password123";

  console.log("Attempting sign up...");
  await supabase.auth.signUp({ email, password, options: { data: { name: "Test", role: "worker" } } });

  console.log("Attempting sign in immediately...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  
  if (signInError) {
    console.log("SignIn Error:", signInError.message);
  } else {
    console.log("SignIn Success! Session exists.");
  }
}

testSignupAndLogin();
