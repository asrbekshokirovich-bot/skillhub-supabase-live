import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const apiKey = process.env.VITE_GEMINI_API_KEY;

async function checkModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  console.log(JSON.stringify(data.models.map(m => m.name), null, 2));
}
checkModels();
