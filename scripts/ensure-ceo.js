import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const email = 'asrbekshokirovich@gmail.com';
  
  const { data: users, error } = await supabase.from('users').select('*').eq('email', email);
  if (error) {
    console.error("Error fetching user:", error);
    return;
  }
  
  if (users.length > 0) {
    const user = users[0];
    if (user.role !== 'ceo') {
      console.log(`User ${email} has role '${user.role}'. Updating to 'ceo'...`);
      const { error: updateError } = await supabase.from('users').update({ role: 'ceo' }).eq('email', email);
      if (updateError) {
         console.error("Failed to update role:", updateError);
      } else {
         console.log("Successfully updated role to 'ceo'.");
      }
    } else {
      console.log(`User ${email} already has the 'ceo' role.`);
    }
  } else {
    console.log(`User ${email} not found in the users table.`);
  }
}

run();
