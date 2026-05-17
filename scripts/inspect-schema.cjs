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
  const { rows } = await client.query(`
    SELECT table_name, column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name IN ('users','projects','tasks','credentials')
    ORDER BY table_name, ordinal_position
  `);
  let current = '';
  rows.forEach(r => {
    if (r.table_name !== current) { console.log('\n=== ' + r.table_name + ' ==='); current = r.table_name; }
    console.log(`  ${r.column_name.padEnd(20)} ${r.data_type} (${r.udt_name})`);
  });
  await client.end();
})();
