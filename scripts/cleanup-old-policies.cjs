const { Client } = require('pg');

const PROJECT_REF = 'rnpjhcrmexmopbulgozw';
const PASSWORD = process.env.SUPABASE_DB_PASSWORD;

(async () => {
  const client = new Client({
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 6543, database: 'postgres',
    user: `postgres.${PROJECT_REF}`, password: PASSWORD,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  // Inspect first
  console.log('=== BEFORE ===');
  const before = await client.query(`
    SELECT policyname, tablename, cmd, qual
    FROM pg_policies
    WHERE schemaname='public'
    ORDER BY tablename, policyname
  `);
  before.rows.forEach(r => console.log(`  ${r.tablename.padEnd(12)} | ${r.cmd.padEnd(6)} | ${r.policyname} | USING: ${r.qual}`));

  // Drop the old permissive credentials policy
  await client.query(`DROP POLICY IF EXISTS "Allow authenticated access to credentials" ON public.credentials`);

  // Also drop any other leftover broad policies if they exist
  await client.query(`DROP POLICY IF EXISTS "Deny delete for projects" ON public.projects`);
  await client.query(`DROP POLICY IF EXISTS "Deny delete for tasks" ON public.tasks`);

  console.log('\n=== AFTER ===');
  const after = await client.query(`
    SELECT policyname, tablename, cmd
    FROM pg_policies
    WHERE schemaname='public'
    ORDER BY tablename, policyname
  `);
  after.rows.forEach(r => console.log(`  ${r.tablename.padEnd(12)} | ${r.cmd.padEnd(6)} | ${r.policyname}`));

  await client.end();
  console.log('\n✅ Cleanup done.');
})();
