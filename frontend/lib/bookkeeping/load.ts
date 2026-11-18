import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tx } from "./reports";

const COLUMNS = "id,kind,category,amount,amount_settled,occurred_on,crop,counterparty,payment_method,notes,receipt_path";

/** Loads the signed-in owner's own entries (RLS also enforces this). */
export async function loadTransactions(supabase: SupabaseClient, userId: string, opts: { from?: string; to?: string } = {}): Promise<Tx[]> {
  let q = supabase.from("farm_transactions").select(COLUMNS).eq("owner_id", userId).order("occurred_on", { ascending: false }).limit(5000);
  if (opts.from) q = q.gte("occurred_on", opts.from);
  if (opts.to) q = q.lte("occurred_on", opts.to);
  const { data, error } = await q;
  if (error) throw new Error("Could not load bookkeeping entries");
  return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount), amount_settled: Number(r.amount_settled) })) as Tx[];
}
