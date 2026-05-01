import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const apiKey = process.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function checkModels() {
  const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-pro'];
  
  for (const m of models) {
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("hello");
      console.log(`Success with: ${m}`);
    } catch (e) {
      console.error(`Failed with: ${m} - ${e.message}`);
    }
  }
}
checkModels();
