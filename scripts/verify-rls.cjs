const { Client } = require('pg');

const PROJECT_REF = 'rnpjhcrmexmopbulgozw';
const PASSWORD = process.env.SUPABASE_DB_PASSWORD;

// IDs from earlier user listing
const CEO_DAVRBEK = 'bbeacd7e-9859-405e-813b-df03b69b11b0';
const WORKER_TEST = '1af7ad23-10b6-4064-89eb-3383028d91c3'; // worker_test@skillhubapp.com

async function runAs(client, userId, label) {
  console.log(`\n=== Running as ${label} (${userId}) ===`);
  await client.query('BEGIN');
  await client.query(`SET LOCAL ROLE authenticated`);
  await client.query(`SET LOCAL request.jwt.claims = '{"sub":"${userId}","role":"authenticated"}'`);

  try {
    const projects = await client.query('SELECT id, title FROM public.projects');
    console.log(`  Projects visible: ${projects.rowCount}`);
    projects.rows.slice(0, 3).forEach(p => console.log(`    - ${p.title}`));

    const tasks = await client.query('SELECT id, title FROM public.tasks');
    console.log(`  Tasks visible:    ${tasks.rowCount}`);

    const creds = await client.query('SELECT id, category FROM public.credentials');
    console.log(`  Credentials visible: ${creds.rowCount}`);
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  } finally {
    await client.query('ROLLBACK');
  }
}

(async () => {
  const client = new Client({
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 6543, database: 'postgres',
    user: `postgres.${PROJECT_REF}`, password: PASSWORD,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log('=== TOTAL ROWS (bypass RLS, as superuser) ===');
  const all = await client.query(`
    SELECT 'projects' AS tbl, COUNT(*) FROM public.projects
    UNION ALL SELECT 'tasks', COUNT(*) FROM public.tasks
    UNION ALL SELECT 'credentials', COUNT(*) FROM public.credentials
    UNION ALL SELECT 'users', COUNT(*) FROM public.users
  `);
  all.rows.forEach(r => console.log(`  ${r.tbl.padEnd(15)} ${r.count}`));

  await runAs(client, CEO_DAVRBEK, 'CEO Davrbek');
  await runAs(client, WORKER_TEST, 'Worker worker_test');

  await client.end();
})();
