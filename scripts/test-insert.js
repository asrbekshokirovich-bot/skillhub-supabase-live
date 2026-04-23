import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('projects').insert({
    name: 'Test Project',
    client: 'Test Client',
    status: 'In Progress',
    progress: 0,
    tasks: 0,
    assignee: 'Unassigned',
    createdBy: 'Test'
  }).select();

  if (error) {
    console.log("Insert Error:", error);
  } else {
    console.log("Insert Success:", data);
  }
}
run();
