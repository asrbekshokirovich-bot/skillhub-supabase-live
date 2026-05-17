const { Client } = require('pg');

const regions = [
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'sa-east-1',
  'ca-central-1'
];

const PROJECT_REF = 'rnpjhcrmexmopbulgozw';
const PASSWORD = process.env.SUPABASE_DB_PASSWORD;

async function tryRegion(region) {
  const host = `aws-1-${region}.pooler.supabase.com`;
  const client = new Client({
    host, port: 6543, database: 'postgres',
    user: `postgres.${PROJECT_REF}`, password: PASSWORD,
    ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000
  });
  try {
    await client.connect();
    const r = await client.query('SELECT current_database()');
    await client.end();
    return { region, ok: true };
  } catch (e) {
    return { region, ok: false, err: e.message };
  }
}

(async () => {
  for (const r of regions) {
    const result = await tryRegion(r);
    if (result.ok) {
      console.log(`✅ FOUND: ${r}`);
      process.exit(0);
    } else {
      console.log(`❌ ${r}: ${result.err}`);
    }
  }
  console.log('No region matched.');
})();
