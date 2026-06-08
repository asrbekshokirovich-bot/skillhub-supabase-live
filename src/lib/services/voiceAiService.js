import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────────────────
// voiceAiService — Gemini-powered voice standup.
//
//  • transcribeAndStructure(): takes the recorded audio + the worker's real
//    context (assigned tasks, projects, recent reports) and returns a faithful
//    transcript plus a 3-bucket standup (Yesterday / Blockers / Today),
//    grounded in the real tasks so it stays at "real task" altitude.
//  • answerManagerQuestion(): the CEO's in-app follow-up Q&A over one report.
//
// Mirrors the existing Gemini pattern in aiTaskService.js (same key, model
// names, structured-JSON output, and overload retry/fallback).
// ─────────────────────────────────────────────────────────────────────────

const REPORT_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    transcript: {
      type: SchemaType.STRING,
      description:
        "A faithful transcription of the spoken audio in its ORIGINAL language(s). The speaker talks Uzbek, often mixed with Russian/English words — keep those words as spoken. Remove only filler ('eee', 'yani') and false starts. Do not translate.",
    },
    yesterday: {
      type: SchemaType.STRING,
      description:
        "What the worker DID / finished / made progress on, as a few concise real tasks. Empty string if they didn't mention it.",
    },
    blockers: {
      type: SchemaType.STRING,
      description:
        "Anything blocking or slowing the worker (problems, waiting-on, bugs). Empty string if none mentioned.",
    },
    today: {
      type: SchemaType.STRING,
      description:
        "What the worker PLANS to do next. Empty string if they didn't mention it.",
    },
    clarifyingQuestions: {
      type: SchemaType.ARRAY,
      description:
        "0 to 2 SHORT follow-up questions, ONLY when something important is missing or too vague to report cleanly. Otherwise an empty array. Ask them in Uzbek.",
      items: { type: SchemaType.STRING },
    },
  },
  required: ["transcript", "yesterday", "blockers", "today", "clarifyingQuestions"],
};

function buildContextText(context = {}) {
  const { tasks = [], projects = [], recentReports = [] } = context;
  const lines = [];

  if (projects.length) {
    lines.push("PROJECTS this worker is on:");
    projects.forEach((p) => lines.push(`  - ${p.title || p.name || p.id}`));
  }
  if (tasks.length) {
    lines.push("OPEN TASKS assigned to this worker (map vague/technical talk to these):");
    tasks.forEach((t) =>
      lines.push(`  - [${t.status || "?"}] ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}`)
    );
  }
  if (recentReports.length) {
    lines.push("WORKER'S RECENT STANDUPS (for continuity — what 'today' was last time):");
    recentReports.forEach((r) => {
      const when = r.reportDate || (r.createdAt ? String(r.createdAt).slice(0, 10) : "");
      lines.push(`  - ${when}: today→ ${r.today || "-"} | blockers→ ${r.blockers || "-"}`);
    });
  }

  return lines.length
    ? lines.join("\n")
    : "(No prior context available for this worker.)";
}

class VoiceAiService {
  _genAI() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing VITE_GEMINI_API_KEY in environment variables. Please add it to your .env file."
      );
    }
    return new GoogleGenerativeAI(apiKey);
  }

  // Run a generateContent call with the same overload-retry + model fallback
  // strategy used by aiTaskService.
  async _generate(parts, generationConfig) {
    const genAI = this._genAI();

    const attempt = async (modelName, retries = 2) => {
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig });
      for (let i = 0; i <= retries; i++) {
        try {
          const result = await model.generateContent(parts);
          return result.response.text();
        } catch (error) {
          const overloaded =
            error.message?.includes("503") || error.message?.includes("429");
          if (overloaded && i < retries) {
            await new Promise((res) => setTimeout(res, 2 ** i * 1000));
            continue;
          }
          throw error;
        }
      }
    };

    try {
      return await attempt("gemini-2.5-flash");
    } catch (primaryError) {
      try {
        return await attempt("gemini-flash-latest");
      } catch (fallbackError) {
        throw new Error(
          `Primary error: ${primaryError.message} | Fallback error: ${fallbackError.message}`
        );
      }
    }
  }

  /**
   * Transcribe the recorded standup and structure it into Yesterday/Blockers/Today,
   * grounded in the worker's real tasks/context.
   * @param {{ audioBase64: string, mimeType: string, context?: object }} input
   * @returns {Promise<{transcript,yesterday,blockers,today,clarifyingQuestions}>}
   */
  async transcribeAndStructure({ audioBase64, mimeType, context }) {
    const prompt = `You are an assistant that turns a worker's spoken DAILY STANDUP into a short, manager-ready report.

The worker is speaking UZBEK, frequently code-switching with Russian and English words. First TRANSCRIBE what they say faithfully, then ORGANIZE it into a standup.

Use the worker's real context below to understand vague or very technical talk and map it to the actual assigned tasks. NEVER invent work that wasn't said — if something is unclear, leave the field shorter or add a clarifying question instead.

WRITE the report (yesterday / blockers / today) in UZBEK, at "real task" altitude — meaningful work items like "Checkout oqimini qayta yig'dim (~5 soat)", NOT micro-steps or button-level detail. Keep each section to a few short lines. If a section wasn't mentioned, return an empty string for it.

--- WORKER CONTEXT ---
${buildContextText(context)}
----------------------`;

    const parts = [
      { text: prompt },
      { inlineData: { data: audioBase64, mimeType: mimeType || "audio/webm" } },
    ];

    const responseText = await this._generate(parts, {
      responseMimeType: "application/json",
      responseSchema: REPORT_SCHEMA,
    });

    let payload;
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new Error("AI returned invalid data format.");
    }

    return {
      transcript: payload.transcript || "",
      yesterday: payload.yesterday || "",
      blockers: payload.blockers || "",
      today: payload.today || "",
      clarifyingQuestions: Array.isArray(payload.clarifyingQuestions)
        ? payload.clarifyingQuestions.slice(0, 2)
        : [],
    };
  }

  /**
   * Answer the manager's follow-up question about a single report, grounded
   * strictly in that report + the worker's context.
   * @param {{ question: string, report: object, context?: object, workerName?: string }} input
   * @returns {Promise<string>}
   */
  async answerManagerQuestion({ question, report, context, workerName }) {
    const prompt = `You are helping a manager understand a worker's daily standup. Answer the manager's question CONCISELY and ONLY from the information below. If the answer isn't in the report or context, say you don't have that detail (do not guess). Reply in the SAME language the manager used in their question.

WORKER: ${workerName || "(worker)"}

--- REPORT ---
Yesterday: ${report.yesterday || "-"}
Blockers: ${report.blockers || "-"}
Today: ${report.today || "-"}

Full transcript:
${report.transcript || "-"}

--- WORKER CONTEXT ---
${buildContextText(context)}
----------------------

MANAGER'S QUESTION: ${question}`;

    const text = await this._generate([{ text: prompt }], {});
    return (text || "").trim();
  }
}

export const voiceAiService = new VoiceAiService();
