"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addBookkeepingEntry(formData: FormData) {
  const type = String(formData.get("entry_type") || "");
  const category = String(formData.get("category") || "").trim();
  const amount = Number(formData.get("amount"));
  const date = String(formData.get("entry_date") || "");
  const description = String(formData.get("description") || "").trim();
  if (!["income", "expense"].includes(type) || category.length < 2 || category.length > 60 ||
      !Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) || description.length > 500) {
    redirect("/bookkeeping?error=invalid");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "farmer") redirect("/dashboard");
  const { error } = await supabase.from("farm_bookkeeping_entries").insert({
    owner_id: user.id, entry_type: type, category, amount, entry_date: date, description,
  });
  if (error) redirect("/bookkeeping?error=save");
  revalidatePath("/bookkeeping");
  redirect("/bookkeeping?saved=1");
}

export async function deleteBookkeepingEntry(formData: FormData) {
  const id = String(formData.get("entry_id") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/bookkeeping?error=delete");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.from("farm_bookkeeping_entries").delete().eq("id", id).eq("owner_id", user.id);
  if (error) redirect("/bookkeeping?error=delete");
  revalidatePath("/bookkeeping");
  redirect("/bookkeeping?deleted=1");
}
