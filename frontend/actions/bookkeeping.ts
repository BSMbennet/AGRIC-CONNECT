"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function farmerClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/bookkeeping");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "farmer") redirect("/dashboard");
  return { supabase, user };
}

function validAmount(value: FormDataEntryValue | null): number | null {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount <= 9999999999.99
    ? Math.round(amount * 100) / 100
    : null;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function addBookkeepingEntry(formData: FormData) {
  const entryType = String(formData.get("entry_type") || "");
  const category = String(formData.get("category") || "").trim();
  const amount = validAmount(formData.get("amount"));
  const entryDate = String(formData.get("entry_date") || "");
  const description = String(formData.get("description") || "").trim();
  const paymentStatus = String(formData.get("payment_status") || "paid");

  if (
    !["income", "expense"].includes(entryType) ||
    category.length < 2 ||
    category.length > 60 ||
    amount === null ||
    !validDate(entryDate) ||
    description.length > 500 ||
    !["paid", "unpaid"].includes(paymentStatus)
  ) {
    redirect("/bookkeeping?error=invalid");
  }

  const { supabase, user } = await farmerClient();
  const { error } = await supabase.from("farm_bookkeeping_entries").insert({
    owner_id: user.id,
    entry_type: entryType,
    category,
    amount,
    entry_date: entryDate,
    description,
    payment_status: paymentStatus,
    paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
  });

  if (error) redirect("/bookkeeping?error=save");
  revalidatePath("/bookkeeping");
  redirect("/bookkeeping?saved=1");
}

export async function updateBookkeepingEntry(formData: FormData) {
  const id = String(formData.get("entry_id") || "");
  const category = String(formData.get("category") || "").trim();
  const amount = validAmount(formData.get("amount"));
  const entryDate = String(formData.get("entry_date") || "");
  const description = String(formData.get("description") || "").trim();

  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    category.length < 2 ||
    category.length > 60 ||
    amount === null ||
    !validDate(entryDate) ||
    description.length > 500
  ) {
    redirect("/bookkeeping?error=invalid");
  }

  const { supabase, user } = await farmerClient();
  const { error } = await supabase.from("farm_bookkeeping_entries").update({
    category,
    amount,
    entry_date: entryDate,
    description,
  }).eq("id", id).eq("owner_id", user.id).eq("entry_source", "manual");

  if (error) redirect("/bookkeeping?error=update");
  revalidatePath("/bookkeeping");
  redirect("/bookkeeping?updated=1");
}

export async function setBookkeepingPaymentStatus(formData: FormData) {
  const id = String(formData.get("entry_id") || "");
  const status = String(formData.get("payment_status") || "");

  if (!/^[0-9a-f-]{36}$/i.test(id) || !["paid", "unpaid"].includes(status)) {
    redirect("/bookkeeping?error=invalid");
  }

  const { supabase, user } = await farmerClient();
  const { error } = await supabase.from("farm_bookkeeping_entries").update({
    payment_status: status,
    paid_at: status === "paid" ? new Date().toISOString() : null,
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
    .eq("id", id)
    .eq("owner_id", user.id)
    .eq("entry_source", "manual");

  if (error) redirect("/bookkeeping?error=delete");
  revalidatePath("/bookkeeping");
  redirect("/bookkeeping?deleted=1");
}
