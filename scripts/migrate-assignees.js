import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log("Starting Assignee Migration...");

  // 1. Fetch all users
  const { data: users, error: usersError } = await supabase.from('users').select('id, name');
  if (usersError) {
    console.error("Failed to fetch users:", usersError);
    return;
  }
  
  const userMap = {};
  users.forEach(u => {
    userMap[u.name] = u.id;
  });
  console.log(`Fetched ${users.length} users.`);

  // 2. Fetch all projects
  const { data: projects, error: projectsError } = await supabase.from('projects').select('id, coverUrl');
  if (projectsError) {
    console.error("Failed to fetch projects:", projectsError);
    return;
  }

  let projectsUpdated = 0;
  for (const p of projects) {
    if (p.coverUrl && p.coverUrl !== 'Unassigned' && !p.coverUrl.includes('-')) { // crude check for UUID
      const userId = userMap[p.coverUrl];
      if (userId) {
        await supabase.from('projects').update({ coverUrl: userId }).eq('id', p.id);
        projectsUpdated++;
      }
    }
  }
  console.log(`Updated ${projectsUpdated} projects.`);

  // 3. Fetch all tasks
  const { data: tasks, error: tasksError } = await supabase.from('tasks').select('id, assignee');
  if (tasksError) {
    console.error("Failed to fetch tasks:", tasksError);
    return;
  }

  let tasksUpdated = 0;
  for (const t of tasks) {
    if (t.assignee && t.assignee !== 'Unassigned' && !t.assignee.includes('-')) {
      const userId = userMap[t.assignee];
      if (userId) {
        await supabase.from('tasks').update({ assignee: userId }).eq('id', t.id);
        tasksUpdated++;
      }
    }
  }
  console.log(`Updated ${tasksUpdated} tasks.`);
  console.log("Migration Complete.");
}

run();
