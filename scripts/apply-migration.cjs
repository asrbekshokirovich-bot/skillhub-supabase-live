// Applies a SQL migration file to Supabase via the Postgres connection.
// Uses the pg library + service_role-derived connection string.
// NOTE: This requires the DB password (different from service_role key).
//       If you don't have it, paste the SQL into the Supabase SQL Editor instead.

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const SQL_FILE = process.env.SQL_FILE || path.join(__dirname, '..', 'src', 'supabase_schema_v7.sql');
const DB_HOST = process.env.SUPABASE_DB_HOST || 'aws-0-eu-central-1.pooler.supabase.com';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const PROJECT_REF = 'rnpjhcrmexmopbulgozw';

if (!DB_PASSWORD) {
  console.error('SUPABASE_DB_PASSWORD env var not set.');
  console.error('Find it in: Supabase Dashboard → Settings → Database → Connection string');
  console.error('Then run:  SUPABASE_DB_PASSWORD=yourpw node scripts/apply-migration.cjs');
  process.exit(1);
}

async function main() {
  const sql = fs.readFileSync(SQL_FILE, 'utf-8');
  const client = new Client({
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to Supabase Postgres.');

  try {
    await client.query(sql);
    console.log('\n✅ Migration v7 applied successfully.\n');

    // Verify policies
    const { rows } = await client.query(`
      SELECT tablename, policyname, cmd
      FROM pg_policies
      WHERE schemaname='public'
      ORDER BY tablename, policyname
    `);
    console.log('Active policies:');
    rows.forEach(r => console.log(`  ${r.tablename.padEnd(15)} | ${r.cmd.padEnd(6)} | ${r.policyname}`));
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
