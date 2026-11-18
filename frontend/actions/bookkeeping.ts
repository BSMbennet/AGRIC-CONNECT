"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RECEIPT_MAX_BYTES, RECEIPT_TYPES, transactionSchema } from "@/lib/bookkeeping/schema";
import { fromCents, toCents } from "@/lib/bookkeeping/reports";

const ALLOWED_ROLES = ["farmer", "cooperative_manager"];

async function requireBookkeeper() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/bookkeeping");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) redirect("/dashboard");
  return { supabase, userId: user.id };
}

export async function createTransaction(formData: FormData) {
  const { supabase, userId } = await requireBookkeeper();
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
  // A fully paid entry is the common case; the form sends "paid" or a partial amount.
  if (raw.settlement === "paid") raw.amount_settled = String(raw.amount ?? "0");
  else if (raw.settlement === "unpaid") raw.amount_settled = "0";
  const parsed = transactionSchema.safeParse(raw);
  if (!parsed.success) redirect("/bookkeeping/new?error=" + encodeURIComponent(parsed.error.issues[0]?.message ?? "invalid"));

  let receipt_path: string | null = null;
  const file = formData.get("receipt");
  if (file instanceof File && file.size > 0) {
    const ext = RECEIPT_TYPES[file.type];
    if (!ext || file.size > RECEIPT_MAX_BYTES) redirect("/bookkeeping/new?error=" + encodeURIComponent("Receipt must be a JPG, PNG, WebP or PDF under 5 MB"));
    receipt_path = `${userId}/${randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("farm-receipts").upload(receipt_path, file, { contentType: file.type, upsert: false });
    if (error) redirect("/bookkeeping/new?error=" + encodeURIComponent("Receipt upload failed. Nothing was saved; please try again."));
  }

  const { error } = await supabase.from("farm_transactions").insert({ ...parsed.data, owner_id: userId, receipt_path });
  // 23505 = same client_submission_id already saved (double tap / retry): treat as success.
  if (error && error.code !== "23505") {
    if (receipt_path) await supabase.storage.from("farm-receipts").remove([receipt_path]);
    redirect("/bookkeeping/new?error=" + encodeURIComponent("Could not save the entry. Please try again."));
  }
  revalidatePath("/bookkeeping");
  redirect("/bookkeeping?saved=1");
}

export async function recordPayment(formData: FormData) {
  const { supabase, userId } = await requireBookkeeper();
  const id = String(formData.get("id") ?? "");
  const add = Number(formData.get("amount"));
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isFinite(add) || add <= 0) redirect("/bookkeeping?error=payment");
  const { data: row } = await supabase.from("farm_transactions").select("amount,amount_settled").eq("id", id).eq("owner_id", userId).maybeSingle();
  if (!row) redirect("/bookkeeping?error=payment");
  const next = toCents(row.amount_settled) + toCents(add);
  if (next > toCents(row.amount)) redirect("/bookkeeping?error=overpay");
  const { error } = await supabase.from("farm_transactions").update({ amount_settled: fromCents(next), updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", userId);
  if (error) redirect("/bookkeeping?error=payment");
  revalidatePath("/bookkeeping");
  redirect("/bookkeeping?paid=1");
}

export async function deleteTransaction(formData: FormData) {
  const { supabase, userId } = await requireBookkeeper();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/bookkeeping?error=delete");
  const { data: row } = await supabase.from("farm_transactions").select("receipt_path").eq("id", id).eq("owner_id", userId).maybeSingle();
  const { error } = await supabase.from("farm_transactions").delete().eq("id", id).eq("owner_id", userId);
  if (error) redirect("/bookkeeping?error=delete");
  if (row?.receipt_path) await supabase.storage.from("farm-receipts").remove([row.receipt_path]);
  revalidatePath("/bookkeeping");
  redirect("/bookkeeping?deleted=1");
}
