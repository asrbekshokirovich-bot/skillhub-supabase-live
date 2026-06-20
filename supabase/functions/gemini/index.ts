// ─────────────────────────────────────────────────────────────────────────
// Edge Function: gemini — authenticated server-side proxy for the Gemini API.
//
// WHY: the app used to call Gemini directly from the browser with
// VITE_GEMINI_API_KEY, which ships the key in the public JS bundle (anyone can
// extract it) and forces every user to share one client-side quota — the main
// cause of "some developers can't submit their voice report" at the morning
// standup rush. This function keeps the key server-side, gates calls behind a
// valid Supabase auth session, and centralises retry / model-fallback and
// safety-block handling.
//
// REQUEST (POST, JSON):
//   { parts: GeminiPart[], generationConfig?: object, model?: string }
// RESPONSE (200):
//   { text: string, finishReason?: string, blockReason?: string }
//
// Deploy:   supabase functions deploy gemini
// Secret:   supabase secrets set GEMINI_API_KEY=<new, rotated key>
// (SUPABASE_URL / SUPABASE_ANON_KEY are injected automatically.)
// ─────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// Try the primary model, then a fallback, retrying transient 429/503s.
const MODELS_FALLBACK = "gemini-flash-latest";
const ENDPOINT = (m: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;

// The Gemini REST API expects Schema.type as an UPPERCASE enum
// ("OBJECT" | "STRING" | "ARRAY" | …). The client builds schemas with
// lowercase literals, so normalise recursively to be safe.
function normalizeSchemaTypes(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(normalizeSchemaTypes);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "type" && typeof v === "string") out[k] = v.toUpperCase();
      else out[k] = normalizeSchemaTypes(v);
    }
    return out;
  }
  return node;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGemini(
  model: string,
  body: unknown,
  key: string,
  retries = 2,
): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(ENDPOINT(model, key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return res;
    // 429 (rate limit) / 503 (overloaded) are worth a short backoff.
    if ((res.status === 429 || res.status === 503) && i < retries) {
      await sleep(2 ** i * 1000);
      continue;
    }
    return res;
  }
  // Unreachable, but satisfies the type checker.
  return fetch(ENDPOINT(model, key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ── Auth: require a valid signed-in Supabase user ──
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Missing authorization." }, 401);
  }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Not authenticated." }, 401);
  } catch (_e) {
    return json({ error: "Auth check failed." }, 401);
  }

  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return json({ error: "Server is missing GEMINI_API_KEY." }, 500);

  let payload: {
    parts?: unknown;
    generationConfig?: Record<string, unknown>;
    model?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const { parts, generationConfig, model } = payload;
  if (!Array.isArray(parts) || parts.length === 0) {
    return json({ error: "`parts` is required." }, 400);
  }

  const gc = generationConfig ? { ...generationConfig } : undefined;
  if (gc && gc.responseSchema) {
    gc.responseSchema = normalizeSchemaTypes(gc.responseSchema);
  }
  const body = {
    contents: [{ role: "user", parts }],
    ...(gc ? { generationConfig: gc } : {}),
  };

  const primary = (model && String(model)) || "gemini-2.5-flash";
  const tryModels = [primary, MODELS_FALLBACK].filter(
    (m, i, a) => a.indexOf(m) === i,
  );

  let lastErrText = "";
  for (const m of tryModels) {
    let res: Response;
    try {
      res = await callGemini(m, body, key);
    } catch (e) {
      lastErrText = `network: ${e instanceof Error ? e.message : String(e)}`;
      continue;
    }
    if (!res.ok) {
      lastErrText = `${res.status}: ${(await res.text()).slice(0, 400)}`;
      // 4xx other than 429 won't be fixed by the fallback model, but trying the
      // fallback is cheap and harmless; continue.
      continue;
    }

    const data = await res.json();
    const blockReason: string | undefined = data?.promptFeedback?.blockReason;
    const candidate = data?.candidates?.[0];
    const finishReason: string | undefined = candidate?.finishReason;
    const text: string = (candidate?.content?.parts ?? [])
      .map((p: { text?: string }) => p?.text ?? "")
      .join("");

    // Return 200 even when empty/blocked so the client can show a precise,
    // localised message AND keep the user's recording for a retry.
    return json({ text, finishReason, blockReason });
  }

  return json({ error: `Gemini request failed. ${lastErrText}` }, 502);
});
