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
type Snapshot = {
  as_of: string;
  profile: { role: string; locality: string | null; municipality: string | null; district: string | null } | null;
  subscription: { plan: string; status: string; current_period_end: string | null } | null;
  listings: { total: number; active: number; limit: number };
  seller: { allocation_count: number; fulfilled_allocations: number; fulfilled_sales_value: number; open_allocations: number; delivery_orders: number; scheduled_deliveries: number };
  buyer: { order_count: number; fulfilled_orders: number; fulfilled_spend: number; open_orders: number; delivery_orders?: number; scheduled_deliveries?: number };
  bookkeeping: { income: number; expenses: number; net_profit: number; unpaid_income: number; paid_income: number; paid_expenses: number; cash_position: number };
};

const zar = (value: number) => new Intl.NumberFormat("en-ZA", {
  style: "currency", currency: "ZAR", maximumFractionDigits: 2,
}).format(Number.isFinite(value) ? value : 0);

function marketplaceAnswer(question: string, snapshot: Snapshot): string | null {
  const q = question.toLowerCase();
  const s = snapshot;
  const listing = /listing|advert|product limit|how many products/.test(q);
  const orders = /order|request|buyer|seller|allocation/.test(q);
  const sales = /sales|sold|revenue|turnover/.test(q);
  const delivery = /deliver|collection|pickup|schedule/.test(q);
  const subscription = /subscription|plan|limit|premium|pro/.test(q);
  const books = /bookkeep|income|expense|profit|cash|paid|unpaid|balance/.test(q);

  if (listing) {
    return "Your listings (as of " + new Date(s.as_of).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) + "):\n" +
      "• Active: " + s.listings.active + "\n• Total: " + s.listings.total + "\n• Active-listing limit: " + s.listings.limit +
      "\n• Remaining active slots: " + Math.max(0, s.listings.limit - s.listings.active) + ".";
  }
  if (subscription) {
    return "Your current subscription record: " + (s.subscription ? s.subscription.plan + " (" + s.subscription.status + ")" : "Free plan / no active paid subscription") +
      ". Your current active-listing limit is " + s.listings.limit + ". The snapshot was calculated at " +
      new Date(s.as_of).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) + ".";
  }
  if (books) {
    return "Your bookkeeping totals (ZAR; as of " + new Date(s.as_of).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) + "):\n" +
      "• Recorded income: " + zar(s.bookkeeping.income) + "\n• Recorded expenses: " + zar(s.bookkeeping.expenses) +
      "\n• Net profit/loss: " + zar(s.bookkeeping.net_profit) + "\n• Unpaid income: " + zar(s.bookkeeping.unpaid_income) +
      "\n• Paid cash position: " + zar(s.bookkeeping.cash_position) +
      "\nNet profit uses all recorded income and expenses; cash position uses only entries marked paid.";
  }
  if (sales) {
    return "Your seller sales (as of " + new Date(s.as_of).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) + "):\n" +
      "• Fulfilled allocations: " + s.seller.fulfilled_allocations + "\n• Fulfilled sales value: " + zar(s.seller.fulfilled_sales_value) +
      "\n• Open seller allocations: " + s.seller.open_allocations +
      "\nFor comparison, your buyer side has " + s.buyer.fulfilled_orders + " fulfilled orders and recorded fulfilled spend of " + zar(s.buyer.fulfilled_spend) + ".";
  }
  if (delivery) {
    return "Your delivery activity (as of " + new Date(s.as_of).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) + "):\n" +
      "• Seller delivery orders: " + s.seller.delivery_orders + "\n• Seller deliveries currently scheduled/in progress: " + s.seller.scheduled_deliveries +
      "\n• Buyer delivery orders: " + (s.buyer.delivery_orders ?? 0) + "\n• Buyer deliveries currently scheduled: " + (s.buyer.scheduled_deliveries ?? 0) + ".";
  }
  if (orders) {
    return "Your marketplace orders (as of " + new Date(s.as_of).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) + "):\n" +
      "Buyer side — " + s.buyer.order_count + " orders total, " + s.buyer.open_orders + " open, " + s.buyer.fulfilled_orders + " fulfilled.\n" +
      "Seller side — " + s.seller.allocation_count + " allocations total, " + s.seller.open_allocations + " open, " + s.seller.fulfilled_allocations + " fulfilled.";
  }
  if (listing || orders || sales || delivery || subscription || books) return null;
  return null;
}

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
  const { data: allowed, error: limitError } = await supabase.rpc("consume_assistant_rate_limit");
  if (limitError) return fail("The assistant is temporarily unavailable. Please try again shortly.", 503);
  if (!allowed) return fail("You have reached the assistant limit of 12 messages per minute. Please wait a moment.", 429);

  const [{ data: snapshotData, error: snapshotError }, { data: profile }] = await Promise.all([
    supabase.rpc("get_assistant_marketplace_snapshot"),
    supabase.from("profiles").select("district").eq("id", user.id).maybeSingle(),
  ]);
  if (snapshotError || !snapshotData) return fail("I could not safely retrieve your marketplace records. Please try again.", 503);
  const snapshot = snapshotData as Snapshot;

  const marketplace = marketplaceAnswer(latest.content, snapshot);
  if (marketplace) {
    return NextResponse.json({
      answer: marketplace,
      sources: [],
      language: parsed.data.language,
      languageNotice: parsed.data.language === "en" ? null : "Verified Tshivenda, Xitsonga and Sepedi response generation is not available yet. This account summary is shown in English.",
      mode: "database_calculation",
      externalProviderUsed: false,
      asOf: snapshot.as_of,
    }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const stopWords = new Set(["the","and","for","with","from","that","this","what","when","where","how","can","you","are","is","my","our","about","please","tell","me","does","have","has","was","were","into","your","need","want","much","many","show","give","should"]);
  const terms = latest.content.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word)).slice(0, 10);
  const searchQuery = [...new Set(terms)].join(" OR ");
  let knowledge: KnowledgeHit[] = [];
  if (searchQuery.length >= 2) {
    const { data, error } = await supabase.rpc("search_agri_knowledge", {
      query_text: searchQuery,
      locality_filter: profile?.district || "Vhembe",
      crop_filter: null,
      result_limit: 5,
    });
    if (!error) knowledge = (data ?? []) as KnowledgeHit[];
  }

  const sources = knowledge.map((item, index) => ({
    id: index + 1, title: item.title, publisher: item.publisher, url: item.source_url,
    heading: item.heading, locality: item.locality_tags, crops: item.crop_tags,
  }));
  const answer = knowledge.length
    ? "I found these approved agricultural notes relevant to " + (profile?.district || "Vhembe") + ". These are source summaries, not a substitute for advice from your local extension officer.\n\n" +
      knowledge.map((item, index) => (index + 1) + ". " + (item.heading || item.title) + "\n" + item.content + " [Source " + (index + 1) + "]").join("\n\n")
    : "I could not find a matching approved agricultural source in the current knowledge library. I won't guess a local planting, fertiliser or pesticide recommendation. Please ask a local agricultural extension officer or try a different crop/topic.";

  return NextResponse.json({
    answer,
    sources,
    language: parsed.data.language,
    languageNotice: parsed.data.language === "en" ? null : "Verified Tshivenda, Xitsonga and Sepedi response generation is not available yet. The retrieved source notes are shown in English.",
    mode: "approved_source_retrieval",
    externalProviderUsed: false,
    voice: { available: false, mode: "typed_input_only" },
    asOf: snapshot.as_of,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
