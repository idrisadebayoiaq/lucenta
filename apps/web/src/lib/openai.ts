type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type Provider = { url: string; key: string; model: string; name: string; headers?: Record<string, string> };

/** "fast" is a cheaper model for scoring/judging calls; "main" writes user-facing text. */
type Tier = "main" | "fast";

/** OpenRouter takes precedence when both keys are set; both expose the OpenAI chat-completions format. */
function provider(tier: Tier = "main"): Provider | null {
  if (process.env.OPENROUTER_API_KEY) {
    return {
      name: "openrouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY,
      model:
        tier === "fast"
          ? process.env.OPENROUTER_FAST_MODEL || "google/gemini-2.5-flash-lite"
          : process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:nitro",
      headers: { "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", "X-Title": "Lucenta" },
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      name: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      key: process.env.OPENAI_API_KEY,
      model: tier === "fast" ? process.env.OPENAI_FAST_MODEL || "gpt-4o-mini" : process.env.OPENAI_MODEL || "gpt-4.1",
    };
  }
  return null;
}

export function isLLMConfigured() {
  return provider() !== null;
}

export function llmEngineName() {
  const p = provider();
  return p ? `${p.name}:${p.model}` : "none";
}

export async function chatCompletion(
  messages: ChatMessage[],
  {
    temperature = 0.7,
    maxTokens = 2000,
    json = false,
    tier = "main",
  }: { temperature?: number; maxTokens?: number; json?: boolean; tier?: Tier } = {},
) {
  const p = provider(tier);
  if (!p) throw new Error("No LLM API key is configured (OPENROUTER_API_KEY or OPENAI_API_KEY).");

  const res = await fetch(p.url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${p.key}`, ...p.headers },
    body: JSON.stringify({
      model: p.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) throw new Error(`The AI provider returned an error (${res.status}).`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content as string | undefined)?.trim() ?? "";
}
