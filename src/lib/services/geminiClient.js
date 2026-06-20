import { supabase } from '../supabase';

// ─────────────────────────────────────────────────────────────────────────
// geminiClient — calls the server-side `gemini` Edge Function instead of
// talking to Google directly from the browser. This keeps the API key off the
// client (it used to ship in the bundle via VITE_GEMINI_API_KEY) and routes
// every request through one authenticated, rate-limit-aware proxy.
//
// Lightweight string enum so callers can describe response schemas without the
// @google/generative-ai SDK. Values are lowercased; the Edge Function
// uppercases them for the Gemini REST API.
// ─────────────────────────────────────────────────────────────────────────

export const SchemaType = {
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
  OBJECT: 'object',
};

/**
 * Run a Gemini generateContent call through the Edge Function.
 * @param {{ parts: any[], generationConfig?: object, model?: string }} req
 * @returns {Promise<{ text: string, finishReason?: string, blockReason?: string }>}
 */
export async function generateContent({ parts, generationConfig, model }) {
  const { data, error } = await supabase.functions.invoke('gemini', {
    body: { parts, generationConfig, model },
  });

  if (error) {
    // supabase-js wraps non-2xx responses; surface the server message if present.
    let detail = error.message || 'AI request failed.';
    try {
      const body = await error.context?.json?.();
      if (body?.error) detail = body.error;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  if (data?.error) throw new Error(data.error);

  return {
    text: data?.text ?? '',
    finishReason: data?.finishReason,
    blockReason: data?.blockReason,
  };
}
