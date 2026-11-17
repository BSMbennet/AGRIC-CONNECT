"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const moderationSchema = z.object({ listing_id: z.string().uuid(), action: z.enum(["moderated", "active"]) });

export async function moderateListing(formData: FormData) {
  const parsed = moderationSchema.safeParse({ listing_id: formData.get("listing_id"), action: formData.get("action") });
  if (!parsed.success) redirect("/admin?error=invalid");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: listing } = await supabase.from("produce_listings").select("moderation_log").eq("id", parsed.data.listing_id).single();
  if (!listing) redirect("/admin?error=not_found");
  const log = Array.isArray(listing.moderation_log) ? listing.moderation_log : [];
  const nextLog = [...log, { action: parsed.data.action, actor_profile_id: user.id, at: new Date().toISOString() }];
  const { error } = await supabase.from("produce_listings").update({
    status: parsed.data.action,
    moderation_log: nextLog,
    updated_at: new Date().toISOString(),
  }).eq("id", parsed.data.listing_id);
  if (error) redirect("/admin?error=moderation");
  revalidatePath("/admin");
  revalidatePath("/marketplace");
  redirect("/admin?updated=1");
}
