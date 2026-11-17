"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const allocationSchema = z.array(z.object({
  listing_id: z.string().uuid(),
  quantity: z.number().positive(),
})).min(2).max(30);

export async function createAggregateOrder(formData: FormData) {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("allocations") || "[]"));
  } catch {
    redirect("/coop/aggregate?error=invalid");
  }
  const parsed = allocationSchema.safeParse(raw);
  if (!parsed.success) redirect("/coop/aggregate?error=invalid");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["buyer", "cooperative_manager"].includes(profile.role)) redirect("/dashboard?error=role");

  const { data, error } = await supabase.rpc("create_aggregate_order", {
    p_buyer_id: user.id,
    p_allocations: parsed.data,
  });
  if (error || !data?.id) redirect(`/coop/aggregate?error=${encodeURIComponent(error?.message || "create")}`);
  revalidatePath("/dashboard");
  revalidatePath("/marketplace");
  redirect(`/orders/${data.id}`);
}
