"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function acceptRequest(formData: FormData) {
  const requestId = String(formData.get("request_id") || "");
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) redirect("/dashboard?error=request");
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.rpc("accept_buyer_request", { p_request_id: requestId });
  if (error || !data?.id) redirect(`/dashboard?error=${encodeURIComponent(error?.message.includes("insufficient_stock") ? "insufficient_stock" : "accept")}`);
  revalidatePath("/dashboard");
  revalidatePath("/marketplace");
  revalidatePath(`/orders/${data.id}`);
  redirect(`/orders/${data.id}`);
}

export async function rejectRequest(formData: FormData) {
  const requestId = String(formData.get("request_id") || "");
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) redirect("/dashboard?error=request");
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("reject_buyer_request", { p_request_id: requestId });
  if (error) redirect("/dashboard?error=reject");
  revalidatePath("/dashboard");
  redirect("/dashboard?rejected=1");
}
