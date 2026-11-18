"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function updateProfile(formData: FormData) {
  const display_name = String(formData.get("display_name") || "").trim();
  const phone_e164 = String(formData.get("phone_e164") || "").trim();
  const locality = String(formData.get("locality") || "").trim();
  const district = String(formData.get("district") || "").trim();
  const preferred_language = String(formData.get("preferred_language") || "en");
  if (display_name.length < 2 || display_name.length > 80 || locality.length > 100 || district.length < 2 || district.length > 100 || phone_e164.length > 20 || !["en", "ve", "ts", "nso"].includes(preferred_language)) {
    redirect("/profile?error=invalid");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.from("profiles").update({ display_name, phone_e164: phone_e164 || null, locality: locality || null, district, preferred_language, updated_at: new Date().toISOString() }).eq("id", user.id);
  if (error) redirect("/profile?error=save");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/profile?saved=1");
}

export async function switchAccountRole(formData: FormData) {
  const role = String(formData.get("role") || "");
  if (role !== "farmer" && role !== "buyer") redirect("/profile?error=role");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["farmer", "buyer"].includes(profile.role)) redirect("/profile?error=role");
  const { error } = await supabase.rpc("switch_account_role", { p_role: role });
  if (error) redirect("/profile?error=switch");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/marketplace");
  revalidatePath("/profile");
  redirect("/profile?role_updated=1");
}
