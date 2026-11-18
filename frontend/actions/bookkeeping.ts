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
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function farmerClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "farmer") redirect("/dashboard");
  return { supabase, user };
}

function validAmount(value: FormDataEntryValue | null) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount <= 9999999999.99 ? amount : null;
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function addBookkeepingEntry(formData: FormData) {
  const type = String(formData.get("entry_type") || "");
  const category = String(formData.get("category") || "").trim();
  const amount = validAmount(formData.get("amount"));
  const date = String(formData.get("entry_date") || "");
  const description = String(formData.get("description") || "").trim();
  const paymentStatus = String(formData.get("payment_status") || "paid");
  if (!["income", "expense"].includes(type) || category.length < 2 || category.length > 60 ||
      !amount || !validDate(date) || description.length > 500 || !["paid", "unpaid"].includes(paymentStatus)) {
    redirect("/bookkeeping?error=invalid");
  }
  const { supabase, user } = await farmerClient();
  const { error } = await supabase.from("farm_bookkeeping_entries").insert({
    owner_id: user.id, entry_type: type, category, amount, entry_date: date,
    description, payment_status: paymentStatus,
    paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
  });
  if (error) redirect("/bookkeeping?error=save");
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
export async function updateBookkeepingEntry(formData: FormData) {
  const id = String(formData.get("entry_id") || "");
  const category = String(formData.get("category") || "").trim();
  const amount = validAmount(formData.get("amount"));
  const date = String(formData.get("entry_date") || "");
  const description = String(formData.get("description") || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || category.length < 2 || category.length > 60 ||
      !amount || !validDate(date) || description.length > 500) redirect("/bookkeeping?error=invalid");
  const { supabase, user } = await farmerClient();
  const { error } = await supabase.from("farm_bookkeeping_entries").update({
    category, amount, entry_date: date, description,
  }).eq("id", id).eq("owner_id", user.id).eq("entry_source", "manual");
  if (error) redirect("/bookkeeping?error=update");
  revalidatePath("/bookkeeping");
  redirect("/bookkeeping?updated=1");
}

export async function setBookkeepingPaymentStatus(formData: FormData) {
  const id = String(formData.get("entry_id") || "");
  const status = String(formData.get("payment_status") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["paid", "unpaid"].includes(status)) redirect("/bookkeeping?error=invalid");
  const { supabase, user } = await farmerClient();
  const { error } = await supabase.from("farm_bookkeeping_entries").update({
    payment_status: status, paid_at: status === "paid" ? new Date().toISOString() : null,
  }).eq("id", id).eq("owner_id", user.id);
  if (error) redirect("/bookkeeping?error=payment");
  revalidatePath("/bookkeeping");
  redirect("/bookkeeping?payment=updated");
}

export async function deleteBookkeepingEntry(formData: FormData) {
  const id = String(formData.get("entry_id") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/bookkeeping?error=delete");
  const { supabase, user } = await farmerClient();
  const { error } = await supabase.from("farm_bookkeeping_entries").delete()
    .eq("id", id).eq("owner_id", user.id).eq("entry_source", "manual");
  if (error) redirect("/bookkeeping?error=delete");
  revalidatePath("/bookkeeping");
  redirect("/bookkeeping?deleted=1");
}
