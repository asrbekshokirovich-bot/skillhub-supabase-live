import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const apiKey = process.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function checkModels() {
  const schema = {
    type: SchemaType.OBJECT,
    properties: {
      tasks: {
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
              description: "A detailed, well-structured, and highly readable description formatted in pure HTML (e.g., using <p>, <ul>, <li>, <strong>). Do NOT use Markdown.",
            }
          },
          required: ["title", "description"],
        },
      },
      issuesDetected: {
        type: SchemaType.ARRAY,
        description: "List of logical sequence errors, spelling mistakes, or typos detected in the uploaded text that you have fixed.",
        items: {
          type: SchemaType.OBJECT,
          properties: {
            originalText: { type: SchemaType.STRING, description: "The original text containing the error" },
            fixedText: { type: SchemaType.STRING, description: "How you fixed it" },
            reason: { type: SchemaType.STRING, description: "Explanation of why it was fixed (e.g., 'Typo', 'Logical sequence skipped from Step 1 to Step 5')" }
          },
          required: ["originalText", "fixedText", "reason"]
        }
      }
    },
    required: ["tasks", "issuesDetected"]
  };

  const model = genAI.getGenerativeModel({ 
    model: 'gemini-flash-latest',
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    }
  });

  const promptText = `You are an expert Project Manager. Identify the core phases from the input and create tasks.
IMPORTANT RULES:
1. Format task descriptions in HTML, not Markdown.
2. Strongly analyze the text for typos, spelling mistakes, or logical sequence errors (like skipping Step numbers). Log these in issuesDetected and fix them in your final tasks output.

Input text:
Phase 1: Setup
We need to set up the DB.
Phase 3: Deployment
Deploy the tehcnical bedrock using vrcel.`;

  try {
    const result = await model.generateContent(promptText);
    console.log(result.response.text());
  } catch (e) {
    console.error(`Failed: ${e.message}`);
  }
}
checkModels();
