import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rnpjhcrmexmopbulgozw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucGpoY3JtZXhtb3BidWxnb3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjg3MTAsImV4cCI6MjA4ODcwNDcxMH0.9sQpjfpOFs387CI3kj7hlM8dXeh_HAZYD4PeRup5fDM";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignup() {
  console.log("Attempting sign up...");
  const { data, error } = await supabase.auth.signUp({
    email: `testuser_${Date.now()}@skillhubapp.com`,
    password: "password123",
    options: {
      data: {
        name: "Test User",
        role: "worker"
      }
    }
  });

  console.log("Signup Data:", JSON.stringify(data, null, 2));
  if (error) console.log("Signup Error:", error.message);
  
  if (data.session) {
    console.log("SESSION CREATED! (Auto-login works)");
  } else if (data.user) {
    console.log("USER CREATED BUT NO SESSION. (Email confirmation might be enabled)");
  }
}

testSignup();
