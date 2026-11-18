import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(2400),
  })).min(1).max(12),
  language: z.enum(["en", "ve", "ts", "nso"]).default("en"),
});
const fail = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });

type KnowledgeHit = {
  chunk_id: string; title: string; publisher: string; source_url: string;
  heading: string | null; content: string; locality_tags: string[]; crop_tags: string[];
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Sign in to use the AgricNorthX assistant.", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Send a valid message and try again.", 400);
  const messages = parsed.data.messages.slice(-10);
  const latest = [...messages].reverse().find((message) => message.role === "user");
  if (!latest) return fail("Ask a question to continue.", 400);

  if (process.env.AI_ASSISTANT_ENABLED !== "true") return fail("The assistant is temporarily disabled by the application administrator.", 503);
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) return fail("The AI service is not configured for this deployment. Ask the administrator to configure the server-side NVIDIA NIM credentials.", 503);
  const baseUrl = (process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/+$/, "");
  const model = process.env.NVIDIA_NIM_MODEL || "nvidia/nemotron-3.5-bolt-e4b";

  const { data: allowed, error: limitError } = await supabase.rpc("consume_assistant_rate_limit");
  if (limitError) return fail("The assistant is temporarily unavailable. Please try again shortly.", 503);
  if (!allowed) return fail("You have reached the assistant limit of 12 messages per minute. Please wait a moment.", 429);

  const [{ data: snapshot, error: snapshotError }, { data: profile }] = await Promise.all([
    supabase.rpc("get_assistant_marketplace_snapshot"),
    supabase.from("profiles").select("locality,municipality,district,preferred_language").eq("id", user.id).maybeSingle(),
  ]);
  if (snapshotError) return fail("I could not safely retrieve your marketplace records. Please try again.", 503);

  const stopWords = new Set(["the","and","for","with","from","that","this","what","when","where","how","can","you","are","is","my","our","about","please","tell","me","does","have","has","was","were","into","your","need","want","much","many","show","give","should"]);
  const terms = latest.content.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word)).slice(0, 10);
  const searchQuery = [...new Set(terms)].join(" OR ");
  let knowledge: KnowledgeHit[] = [];
  if (searchQuery.length >= 2) {
    const { data } = await supabase.rpc("search_agri_knowledge", {
      query_text: searchQuery,
      locality_filter: profile?.district || "Vhembe",
      crop_filter: null,
      result_limit: 5,
    });
    knowledge = (data ?? []) as KnowledgeHit[];
  }

  const sources = knowledge.map((item, index) => ({
    id: index + 1, title: item.title, publisher: item.publisher, url: item.source_url,
    heading: item.heading, locality: item.locality_tags, crops: item.crop_tags,
  }));
  const knowledgeContext = knowledge.map((item, index) =>
    "[Source " + (index + 1) + "] " + item.title + " — " + item.publisher +
    "\n" + (item.heading ?? "") + "\n" + item.content + "\nURL: " + item.source_url
  ).join("\n\n");

  const languageNames: Record<string, string> = {
    en: "English", ve: "Tshivenda", ts: "itsonga", nso: "Sepedi",
  };
  const system = [
    "You are the AgricNorthX assistant for smallholder farmers and buyers in Limpopo, South Africa.",
    "Use the signed-in user's marketplace snapshot below as the only source for personal account facts, orders, sales, delivery status, listing counts, subscriptions and bookkeeping.",
    "Never invent, estimate or extrapolate account figures. State the relevant as-of timestamp. Distinguish fulfilled sales value from paid cash. For bookkeeping, use net_profit for recorded income minus expenses, cash_position for paid income minus paid expenses, and unpaid_income for amounts not yet received. If a field is absent, say it is unavailable.",
    "The snapshot is scoped by auth.uid() in a private server-side database function and verified server-side authentication. Never disclose data about another user or infer other users' activity.",
    "For agricultural advice, use only the supplied retrieved source passages for specific local claims. Cite claims as [Source 1], [Source 2], etc. If the passages do not support an answer, say that the knowledge library does not yet contain a verified answer and recommend a local agricultural extension officer. Never fabricate citations.",
    "Never give pesticide mixing rates, chemical application rates, withdrawal periods or veterinary treatment instructions unless a current approved source explicitly provides them; tell the farmer to follow the registered product label and local extension advice.",
    "Be concise, practical, and clear about uncertainty. Use metric units and South African Rand (ZAR) when relevant.",
    "Reply in " + languageNames[parsed.data.language] + " where you can do so reliably. Tshivenda, Xitsonga and Sepedi output is experimental and has not been validated by native speakers; do not claim fluency or certified translation. If you cannot confidently express a safety-critical instruction, say so and provide a short English clarification.",
    "If asked about voice, explain that this assistant currently supports typed input only; browser speech support is not enabled or verified for the priority languages.",
  ].join("\n\n");

  const context = "AUTHENTICATED USER MARKETPLACE SNAPSHOT (computed from current database records; do not alter these values):\n" +
    JSON.stringify(snapshot) +
    "\n\nRETRIEVED AGRICULTURAL KNOWLEDGE (cite only these sources):\n" +
    (knowledgeContext || "No matching approved agricultural documents were found for this question.");

  try {
    const response = await fetch(baseUrl + "/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          { role: "system", content: system + "\n\n" + context },
          ...messages,
        ],
      }),
      signal: AbortSignal.timeout(25000),
      cache: "no-store",
    });
    if (!response.ok) return fail("The AI service could not answer right now. Please try again.", 502);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
    const answer = payload.choices?.[0]?.message?.content?.trim();
    if (!answer) return fail("The assistant returned an empty response. Please try again.", 502);
    return NextResponse.json({
      answer,
      sources,
      language: parsed.data.language,
      languageNotice: parsed.data.language === "en" ? null : "Priority-language responses are experimental and have not yet been reviewed by native speakers.",
      voice: { available: false, mode: "typed_input_only" },
      asOf: (snapshot as { as_of?: string } | null)?.as_of ?? new Date().toISOString(),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return fail("The assistant connection timed out. Please try again.", 502);
  }
}
