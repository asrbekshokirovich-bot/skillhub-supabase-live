import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  console.log('Fetching single task to see schema...');
  // Force an error to get schema or just get 1 row
  const { data, error } = await supabase.from('tasks').select('*').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}

inspectSchema();
