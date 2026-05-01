const { execSync } = require('child_process');

const url = "https://rnpjhcrmexmopbulgozw.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucGpoY3JtZXhtb3BidWxnb3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjg3MTAsImV4cCI6MjA4ODcwNDcxMH0.9sQpjfpOFs387CI3kj7hlM8dXeh_HAZYD4PeRup5fDM";

console.log('Adding URL...');
execSync(`npx vercel env add VITE_SUPABASE_URL production`, { input: url, stdio: ['pipe', 'inherit', 'inherit'] });

console.log('Adding KEY...');
execSync(`npx vercel env add VITE_SUPABASE_ANON_KEY production`, { input: key, stdio: ['pipe', 'inherit', 'inherit'] });

console.log('Done.');
