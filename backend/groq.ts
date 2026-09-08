// Thin client for Groq's OpenAI-compatible chat completions API. Server-side
// only — the key must never reach the browser bundle (see assistant.ts's
// header comment for why: only index.ts's /api/assistant/* routes ever call
// into this file). Kept as its own module so assistant.ts's prompt-building
// logic stays separate from the HTTP mechanics of whichever LLM provider is
// configured.

// This account's Groq key only has access to a specific model set (checked
// against GET /openai/v1/models at integration time) — no meta-llama chat
// models, so default to the largest general-purpose instruction model that
// IS available rather than a commonly-documented Groq default that 404s here.
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// A 429 from Groq is almost always the account's tokens-per-minute allowance
// being briefly exhausted (a burst of chat messages, each carrying the route
// guide and the live-facts context). Groq says how long to wait — in a
// Retry-After header and/or "Please try again in 2.6s" in the body — so wait
// that long (bounded) and try once more before giving up.
const RETRY_MAX_MS = 8000;

function retryDelayMs(res: Response, bodyText: string): number {
  const header = Number(res.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, RETRY_MAX_MS);
  const m = bodyText.match(/try again in ([\d.]+)\s*(ms|s)\b/i);
  if (m) return Math.min(Number(m[1]) * (m[2].toLowerCase() === "ms" ? 1 : 1000), RETRY_MAX_MS);
  return 2500;
}

async function postChat(apiKey: string, body: string): Promise<Response> {
  return fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  });
}

// Sends a system + user message pair and returns the parsed JSON object the
// model replied with (Groq's json_object response format guarantees valid
// JSON syntax, but not any particular shape — callers still validate shape).
export async function groqChatJSON({ system, user, temperature = 0.2 }: { system: string; user: string; temperature?: number }): Promise<unknown> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("The assistant isn't configured yet (missing GROQ_API_KEY).");

  const payload = JSON.stringify({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
    response_format: { type: "json_object" },
  });

  let res = await postChat(apiKey, payload);
  if (res.status === 429) {
    const text = await res.text().catch(() => "");
    const delay = retryDelayMs(res, text);
    console.warn(`Groq rate limit (429) — retrying once in ${delay} ms`);
    await new Promise((resolve) => setTimeout(resolve, delay + 250));
    res = await postChat(apiKey, payload);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Assistant request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body?.choices?.[0]?.message?.content;
  if (!text) throw new Error("The assistant returned no content.");

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The assistant returned invalid JSON.");
  }
}
