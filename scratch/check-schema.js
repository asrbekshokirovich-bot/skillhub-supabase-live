import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'owner@skillhubapp.com',
    password: 'OwnerPassword123!',
  });

  const dummyId = '11111111-1111-1111-1111-111111111111';
  await supabase.from('projects').insert({
    id: dummyId,
    title: 'Dummy',
    description: 'Dummy',
    createdBy: authData.user.id
  });

  const { data, error } = await supabase.from('projects').select('*').eq('id', dummyId);
  if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  } else {
    console.log("No data or error:", error);
  }

  await supabase.from('projects').delete().eq('id', dummyId);
}
run();
