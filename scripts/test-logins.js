import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const users = ['owner', 'admin', 'test', 'demo', 'developer', 'client', 'user'];
const passwords = ['password', 'password123', 'admin', 'admin123', '123456', '12345678', 'test', 'owner'];

async function run() {
  for (const u of users) {
    for (const p of passwords) {
      const email = `${u}@skillhubapp.com`;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: p });
      if (!error && data.user) {
        console.log(`FOUND CREDENTIALS: username: ${u}, password: ${p}`);
        return;
      }
    }
  }
  console.log("No common credentials found.");
}
run();
