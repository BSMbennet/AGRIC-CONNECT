export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };
export type NimResult = { text: string; model: string; promptTokens: number | null; completionTokens: number | null };

export const nimConfigured = () => Boolean(process.env.NVIDIA_NIM_API_KEY) && process.env.AI_ASSISTANT_ENABLED === "true";

/**
 * Calls an OpenAI-compatible NVIDIA NIM chat endpoint from the server only.
 * Base URL and model come from env so they can be changed without code edits.
 */
export async function callNim(messages: ChatMsg[], signal?: AbortSignal): Promise<NimResult> {
  const key = process.env.NVIDIA_NIM_API_KEY;
  const base = (process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/+$/, "");
  const model = process.env.NVIDIA_NIM_MODEL;
  if (!key || !model) throw new Error("NIM not configured");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 700, stream: false }),
    signal: signal ?? AbortSignal.timeout(25_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`NIM HTTP ${res.status}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("NIM empty response");
  return { text, model, promptTokens: json.usage?.prompt_tokens ?? null, completionTokens: json.usage?.completion_tokens ?? null };
}
