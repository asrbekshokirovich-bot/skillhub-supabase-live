import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const apiKey = process.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function checkModels() {
  const schema = {
    type: SchemaType.ARRAY,
    description: "List of project tasks extracted from the plan",
    items: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: "A clear, concise title for the task. It MUST start with 'Step X: ' where X is the step sequence number.",
        },
        description: {
          type: SchemaType.STRING,
          description: "A detailed, well-structured, and highly readable description. Use clear bullet points and spacing.",
        }
      },
      required: ["title", "description"],
    },
  };

  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    }
  });

  try {
    const result = await model.generateContent("Create a plan to build a website.");
    console.log(result.response.text());
  } catch (e) {
    console.error(`Failed: ${e.message}`);
  }
}
checkModels();
