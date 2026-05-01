import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export const aiTaskService = {
  /**
   * Translates a structured input (text or pdf base64) into a structured array of tasks.
   * Uses Gemini multimodal capabilities to identify phases/steps/milestones.
   */
  async generateTasksFromPlan(input) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("Missing VITE_GEMINI_API_KEY in environment variables. Please add it to your .env file.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // We want the output as structured JSON.
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
                description: "A detailed, well-structured, and highly readable description formatted in pure HTML (e.g., using <p>, <ul>, <li>, <strong>). Do NOT use Markdown formatting.",
              }
            },
            required: ["title", "description"],
          },
        },
        issuesDetected: {
          type: "array",
          description: "A list of typos, spelling mistakes, or numbering errors you found in the text and fixed.",
          items: {
            type: "object",
            properties: {
              originalText: { type: "string", description: "The exact text with the typo." },
              fixedText: { type: "string", description: "The corrected text." },
              reason: { type: "string", description: "A very short, simple, human-friendly reason (e.g. 'Fixed typo', 'Corrected numbering'). DO NOT mention AI, Gemini, parsing, or algorithms." }
            },
            required: ["originalText", "fixedText", "reason"]
          }
        }
      },
      required: ["tasks", "issuesDetected"]
    };

    const promptText = `You are an expert Project Manager. I will provide you with a project plan, either as text or as a presentation document (PDF). Your goal is to logically understand the plan, identify the core phases, steps, or milestones (often 5 to 15 items), and extract them into project tasks.
    
    If it's a visual presentation, read the slides, analyze charts/diagrams, and understand the workflow.
    IMPORTANT RULES:
    1. Uniform Titles: Even if the text uses terms like "Phase 1", "Sprint 2", or "Milestone A", you MUST normalize the title to start with "Step X: [Task Name]" where X is the sequence number (e.g. "Step 1: Setup Infrastructure").
    2. Exact Copy-Paste Descriptions: DO NOT summarize or rewrite the description text in your own words. You MUST literally copy and paste the exact text/bullet points provided for that phase in the original document. 
    3. HTML Descriptions: Ensure the extracted description is formatted in valid HTML (e.g., <p>, <ul>, <li>, <strong>) so it renders correctly. DO NOT use markdown like **bold**.
    4. Error Analysis & Fixes: While copy-pasting, strongly analyze the text for typos, spelling mistakes, or logical sequence errors (like skipping Step numbers). Log these in 'issuesDetected' and fix them in your final tasks output. 
       - ONLY fix clear errors; do not change the information capacity or phrasing otherwise.
       - NEVER mention "AI", "Gemini", "OCR", or "algorithm" in your reason.
       - Keep your reason extremely simple and human-friendly, e.g. "Fixed a typo", "Corrected sequence numbering".
    5. Do not skip any phases, but keep the total number of tasks practical (usually between 5 and 15).`;

    const parts = [{ text: promptText }];

    if (input.type === 'pdf') {
      parts.push({
        inlineData: {
          data: input.data,
          mimeType: input.mimeType
        }
      });
    } else {
      parts.push({
        text: `\nHere is the project plan text:\n-----------------------\n${input.data}\n-----------------------`
      });
    }

    const attemptGeneration = async (modelName, retries = 2) => {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        }
      });

      for (let i = 0; i <= retries; i++) {
        try {
          const result = await model.generateContent(parts);
          return result.response.text();
        } catch (error) {
          const isOverloaded = error.message?.includes('503') || error.message?.includes('429');
          if (isOverloaded && i < retries) {
            console.warn(`[AI] Model ${modelName} overloaded, retrying in ${2 ** i}s...`);
            await new Promise(res => setTimeout(res, (2 ** i) * 1000));
            continue;
          }
          throw error;
        }
      }
    };

    try {
      let responseText;
      let primaryErrorObj = null;
      try {
        // Try the primary model first
        responseText = await attemptGeneration("gemini-2.5-flash");
      } catch (primaryError) {
        primaryErrorObj = primaryError;
        // Fallback to flash-latest if primary completely fails due to load/downtime
        console.warn("[AI] Primary model failed, falling back to gemini-flash-latest...", primaryError);
        try {
          responseText = await attemptGeneration("gemini-flash-latest");
        } catch (fallbackError) {
          throw new Error(`Primary error: ${primaryError.message} | Fallback error: ${fallbackError.message}`);
        }
      }
      
      try {
        const resultPayload = JSON.parse(responseText);
        // Ensure resultPayload has expected structure even if AI hallucinated
        return {
          tasks: resultPayload.tasks || [],
          issuesDetected: resultPayload.issuesDetected || []
        };
      } catch (e) {
        console.error("Failed to parse Gemini response as JSON:", responseText);
        throw new Error("AI returned invalid data format.");
      }
    } catch (error) {
      console.error("Error generating tasks from AI:", error);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }
};
