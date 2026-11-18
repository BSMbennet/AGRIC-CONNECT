import type { SupabaseClient } from "@supabase/supabase-js";
import { hasPremiumAnalytics } from "../entitlements";
import { loadTransactions } from "../bookkeeping/load";
import { periodRange, summarise, todayInJohannesburg } from "../bookkeeping/reports";
import type { Role } from "./navigation";

export type AiContext = {
  role: Role;
  tier: "free" | "pro";
  district: string | null;
  locality: string | null;
  today: string;
  /** Produce names only (no prices, buyers or contact details). */
  activeListingNames: string[];
  openOrderCount: number | null;
  /** Totals from the user's own recorded entries this month; only loaded for money questions. */
  thisMonthMoney: { income: number; expense: number; net: number; entries: number } | null;
};

export const MONEY_QUESTION = /profit|expens|income|money|cost|spent|earn|sales?\b|bookkeep|loss|paid|owe/i;

/**
 * Loads the SMALLEST useful account context for the signed-in user, using their own session (RLS applies).
 * Deliberately excludes: name, phone, email, buyer details, addresses, receipts, other users' data.
 */
export async function buildContext(supabase: SupabaseClient, userId: string, question: string): Promise<AiContext | null> {
  const { data: profile, error } = await supabase.from("profiles").select("role,district,locality").eq("id", userId).maybeSingle();
  if (error) { console.error("[assistant] profile load failed", error.code); return null; }
  if (!profile) return null;
  const role = profile.role as Role;
  const today = todayInJohannesburg();

  let activeListingNames: string[] = [];
  if (role === "farmer") {
    const { data, error: e } = await supabase.from("produce_listings").select("produce_name").eq("farmer_id", userId).eq("status", "active").limit(15);
    if (e) console.error("[assistant] listings load failed", e.code);
    activeListingNames = [...new Set((data ?? []).map((r: { produce_name: string }) => r.produce_name))];
  }

  let openOrderCount: number | null = null;
  if (role === "buyer") {
    const { count, error: e } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("buyer_id", userId).in("status", ["pending", "accepted"]);
    if (e) console.error("[assistant] orders count failed", e.code); else openOrderCount = count ?? 0;
  }

  let thisMonthMoney: AiContext["thisMonthMoney"] = null;
  if ((role === "farmer" || role === "cooperative_manager") && MONEY_QUESTION.test(question)) {
    try {
      const r = periodRange("month", today);
      const txs = await loadTransactions(supabase, userId, r);
      const s = summarise(txs);
      thisMonthMoney = { income: s.income, expense: s.expense, net: s.net, entries: txs.length };
    } catch { thisMonthMoney = null; }
  }

  return {
    role, tier: (await hasPremiumAnalytics(supabase, userId, role)) ? "pro" : "free",
    district: profile.district ?? null, locality: profile.locality ?? null, today, activeListingNames, openOrderCount, thisMonthMoney,
  };
}
