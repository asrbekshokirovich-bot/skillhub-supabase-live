import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rnpjhcrmexmopbulgozw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucGpoY3JtZXhtb3BidWxnb3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjg3MTAsImV4cCI6MjA4ODcwNDcxMH0.9sQpjfpOFs387CI3kj7hlM8dXeh_HAZYD4PeRup5fDM";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function introspect() {
  const { data, error } = await supabase.rpc('get_projects_schema');
  // Since we don't have rpc, let's just do a select limit 1
  const { data: d2, error: e2 } = await supabase.from('projects').select('*').limit(1);
  console.log("Current columns in projects (if any row exists):");
  if (d2 && d2.length > 0) {
    console.log(Object.keys(d2[0]));
  } else {
    // try to insert an empty row to see what fails
    console.log("No rows found. Try inserting empty.");
  }
}

introspect();
