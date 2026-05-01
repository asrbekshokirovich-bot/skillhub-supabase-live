import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rnpjhcrmexmopbulgozw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucGpoY3JtZXhtb3BidWxnb3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjg3MTAsImV4cCI6MjA4ODcwNDcxMH0.9sQpjfpOFs387CI3kj7hlM8dXeh_HAZYD4PeRup5fDM";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignupExisting() {
  const email = `asrbek@skillhubapp.com`;
  const password = "password123";

  console.log("Attempting sign up for EXISTING USER...");
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name: "Test", role: "worker" } } });
  
  if (error) {
    console.log("Signup Error:", error.message);
  } else {
    console.log("Signup Success! (Wait, did it return an error?)", JSON.stringify(data));
  }
}

testSignupExisting();
