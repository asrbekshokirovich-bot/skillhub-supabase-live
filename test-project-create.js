import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rnpjhcrmexmopbulgozw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucGpoY3JtZXhtb3BidWxnb3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjg3MTAsImV4cCI6MjA4ODcwNDcxMH0.9sQpjfpOFs387CI3kj7hlM8dXeh_HAZYD4PeRup5fDM";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProjectCreate() {
  const { data, error } = await supabase.from('projects').insert({
    name: "Test Project",
    client: "David",
    status: 'In Progress',
    progress: 0,
    tasks: 0,
    assignee: 'worker_test',
    createdBy: 'Unknown'
  }).select();
  
  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Success:", data);
  }
}

testProjectCreate();
