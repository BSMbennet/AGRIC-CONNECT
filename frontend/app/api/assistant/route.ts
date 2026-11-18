import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestSchema } from "@/lib/ai/schema";
import { buildContext } from "@/lib/ai/context";
import { systemPrompt } from "@/lib/ai/prompt";
import { callNim, nimConfigured, type ChatMsg } from "@/lib/ai/nim";
import { decide } from "@/lib/ai/limits";
import { fallbackAnswer, sanitiseLinks } from "@/lib/ai/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200, headers?: Record<string, string>) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function POST(request: NextRequest) {
  // Same-origin only (browsers send Origin on POST); blocks cross-site form/script abuse.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) return json({ error: "forbidden" }, 403);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Please sign in to use the assistant." }, 401);

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, 400);
  const { message, language, conversationId } = parsed.data;

  const ctx = await buildContext(supabase, user.id, message);
  if (!ctx) return json({ error: "Your profile could not be loaded. Please try again." }, 500);

  // Rate limit from the user's own usage rows (RLS-scoped).
  const now = Date.now();
  const since = (ms: number) => new Date(now - ms).toISOString();
  const [{ count: perMin }, { count: perDay }] = await Promise.all([
    supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since(60_000)),
    supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since(86_400_000)),
  ]);
  const decision = decide(ctx.tier, perMin ?? 0, perDay ?? 0);
  if (!decision.allowed) {
    return json({ error: decision.reason === "minute" ? "You are asking too quickly. Please wait a minute." : "You have reached today's assistant limit. It resets tomorrow." + (ctx.tier === "free" ? " Pro farmers get a higher limit." : ""), limited: true }, 429, { "Retry-After": String(decision.retryAfterSeconds) });
  }

  // Conversation (ownership enforced by RLS and an explicit check).
  let convId = conversationId ?? null;
  if (convId) {
    const { data: c } = await supabase.from("ai_conversations").select("id").eq("id", convId).eq("user_id", user.id).maybeSingle();
    if (!c) convId = null;
  }
  if (!convId) {
    const { data: c, error } = await supabase.from("ai_conversations").insert({ user_id: user.id, language, title: message.slice(0, 80) }).select("id").single();
    if (error || !c) { console.error("[assistant] conversation create failed", error?.code); return json({ error: "Could not start the conversation." }, 500); }
    convId = c.id as string;
  }

  const { data: historyRows } = await supabase.from("ai_messages").select("role,content").eq("conversation_id", convId).order("created_at", { ascending: false }).limit(10);
  const history = ((historyRows ?? []) as { role: "user" | "assistant"; content: string }[]).reverse();

  const { error: saveUserErr } = await supabase.from("ai_messages").insert({ conversation_id: convId, user_id: user.id, role: "user", content: message });
  if (saveUserErr) console.error("[assistant] save user message failed", saveUserErr.code);

  let answer: string, outcome: "ok" | "fallback" | "error" = "ok", model: string | null = null, pt: number | null = null, ct: number | null = null;
  if (nimConfigured()) {
    try {
      const msgs: ChatMsg[] = [{ role: "system", content: systemPrompt(ctx, language) }, ...history, { role: "user", content: message }];
      const r = await callNim(msgs);
      answer = sanitiseLinks(r.text, ctx.role); model = r.model; pt = r.promptTokens; ct = r.completionTokens;
    } catch (e) {
      console.error("[assistant] NIM failed", e instanceof Error ? e.message : "unknown");
      answer = fallbackAnswer(message, ctx.role).text; outcome = "error";
    }
  } else {
    answer = fallbackAnswer(message, ctx.role).text; outcome = "fallback";
  }

  const { error: saveBotErr } = await supabase.from("ai_messages").insert({ conversation_id: convId, user_id: user.id, role: "assistant", content: answer.slice(0, 8000) });
  if (saveBotErr) console.error("[assistant] save reply failed", saveBotErr.code);
  await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId).eq("user_id", user.id);
  const { error: usageErr } = await supabase.from("ai_usage").insert({ user_id: user.id, conversation_id: convId, model, prompt_tokens: pt, completion_tokens: ct, outcome });
  if (usageErr) console.error("[assistant] usage insert failed", usageErr.code);

  return json({ conversationId: convId, reply: answer, degraded: outcome !== "ok" });
}
