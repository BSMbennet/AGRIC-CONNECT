"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { listingSchema } from "@/lib/validation/listing";

export async function createListing(formData: FormData) {
  const parsed = listingSchema.safeParse({
    client_submission_id: formData.get("client_submission_id"),
    farmer_id: formData.get("farmer_id") || undefined,
    category: formData.get("category"),
    is_organic: formData.get("is_organic"),
    produce_name: formData.get("produce_name"),
    quantity_available: formData.get("quantity_available"),
    unit: formData.get("unit"),
    asking_price: formData.get("asking_price"),
    price_unit: formData.get("price_unit"),
    available_from: formData.get("available_from"),
    harvest_date: formData.get("harvest_date"),
    contact_phone: formData.get("contact_phone"),
    fulfilment_details: formData.get("fulfilment_details"),
    expires_at: formData.get("expires_at") || "",
    quality_notes: formData.get("quality_notes") || "",
    locality: formData.get("locality"),
    municipality: formData.get("municipality") || "",
    district: formData.get("district"),
  });
  if (!parsed.success) {
    console.error("[listings] validation failed", parsed.error.flatten());
    redirect("/listings/new?error=invalid");
  }

  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role, cooperative_id").eq("id", user.id).single();
  if (!profile) redirect("/dashboard?error=role");
  let farmerId = user.id;
  let cooperativeId = profile.cooperative_id;
  if (profile.role === "agent") {
    if (!parsed.data.farmer_id) redirect("/dashboard?error=farmer_required");
    const { data: assignedFarmer } = await supabase.from("profiles").select("id,cooperative_id")
      .eq("id", parsed.data.farmer_id).eq("created_by_agent_id", user.id).single();
    if (!assignedFarmer) redirect("/dashboard?error=assignment");
    farmerId = assignedFarmer.id;
    cooperativeId = assignedFarmer.cooperative_id;
  } else if (profile.role !== "farmer" || (parsed.data.farmer_id && parsed.data.farmer_id !== user.id)) {
    redirect("/dashboard?error=role");
  }

  const { data: inserted, error } = await supabase.from("produce_listings").upsert({
    farmer_id: farmerId,
    cooperative_id: cooperativeId,
    category: parsed.data.category,
    is_organic: parsed.data.is_organic,
    produce_name: parsed.data.produce_name,
    quantity_available: parsed.data.quantity_available,
    unit: parsed.data.unit,
    asking_price: parsed.data.asking_price,
    price_unit: parsed.data.price_unit,
    available_from: parsed.data.available_from,
    harvest_date: parsed.data.harvest_date || parsed.data.available_from,
    expires_at: parsed.data.expires_at ? new Date(parsed.data.expires_at).toISOString() : null,
    quality_notes: parsed.data.quality_notes || null,
    locality: parsed.data.locality,
    municipality: parsed.data.municipality || null,
    district: parsed.data.district,
    status: "active",
    source_channel: profile.role === "agent" ? "agent" : "app",
    client_submission_id: parsed.data.client_submission_id,
  }, { onConflict: "farmer_id,client_submission_id", ignoreDuplicates: true }).select("id").maybeSingle();

  if (error) {
    console.error("[listings] insert failed", { code: error.code, message: error.message, details: error.details, hint: error.hint });
    redirect(error.message.includes("farmer_listing_limit_reached") ? "/listings/new?error=limit" : "/listings/new?error=save");
  }
  let listingId = inserted?.id;
  if (!listingId) {
    const { data: existing, error: lookupError } = await supabase.from("produce_listings")
      .select("id").eq("farmer_id", farmerId).eq("client_submission_id", parsed.data.client_submission_id).single();
    if (lookupError || !existing) redirect("/listings/new?error=save");
    listingId = existing.id;
  }

  const { error: privateDetailsError } = await supabase.from("listing_private_details").upsert({
    listing_id: listingId,
    farmer_id: farmerId,
    contact_phone: parsed.data.contact_phone,
    fulfilment_details: parsed.data.fulfilment_details,
    updated_at: new Date().toISOString(),
  });
  if (privateDetailsError) {
    console.error("[listings] private details save failed", { code: privateDetailsError.code, message: privateDetailsError.message });
    redirect("/listings/new?error=save");
  }
  revalidatePath("/marketplace");
  revalidatePath("/dashboard");
  redirect("/listings/" + listingId + "/photos?created=1");
}


export async function syncListingDraft(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  const { data: profile } = await supabase.from("profiles").select("role,cooperative_id").eq("id", user.id).single();
  if (!profile) return { ok: false, error: "role" };
  let farmerId = user.id;
  let cooperativeId = profile.cooperative_id;
  if (profile.role === "agent") {
    if (!parsed.data.farmer_id) return { ok: false, error: "farmer_required" };
    const { data: assignedFarmer } = await supabase.from("profiles").select("id,cooperative_id")
      .eq("id", parsed.data.farmer_id).eq("created_by_agent_id", user.id).single();
    if (!assignedFarmer) return { ok: false, error: "assignment" };
    farmerId = assignedFarmer.id;
    cooperativeId = assignedFarmer.cooperative_id;
  } else if (profile.role !== "farmer" || (parsed.data.farmer_id && parsed.data.farmer_id !== user.id)) {
    return { ok: false, error: "role" };
  }

  const { data: syncedListing, error } = await supabase.from("produce_listings").upsert({
    farmer_id: farmerId,
    cooperative_id: cooperativeId,
    category: parsed.data.category,
    is_organic: parsed.data.is_organic,
    produce_name: parsed.data.produce_name,
    quantity_available: parsed.data.quantity_available,
    unit: parsed.data.unit,
    asking_price: parsed.data.asking_price,
    price_unit: parsed.data.price_unit,
    available_from: parsed.data.available_from,
    harvest_date: parsed.data.harvest_date || parsed.data.available_from,
    expires_at: parsed.data.expires_at ? new Date(parsed.data.expires_at).toISOString() : null,
    quality_notes: parsed.data.quality_notes || null,
    locality: parsed.data.locality,
    municipality: parsed.data.municipality || null,
    district: parsed.data.district,
    status: "active",
    source_channel: profile.role === "agent" ? "agent" : "app",
    client_submission_id: parsed.data.client_submission_id,
  }, { onConflict: "farmer_id,client_submission_id", ignoreDuplicates: true }).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message.includes("farmer_listing_limit_reached") ? "limit" : "save" };
  let listingId = syncedListing?.id;
  if (!listingId) {
    const { data: existing } = await supabase.from("produce_listings").select("id").eq("farmer_id",farmerId).eq("client_submission_id",parsed.data.client_submission_id).single();
    listingId = existing?.id;
  }
  if (!listingId) return { ok: false, error: "save" };
  const { error: privateError } = await supabase.from("listing_private_details").upsert({listing_id:listingId,farmer_id:farmerId,contact_phone:parsed.data.contact_phone,fulfilment_details:parsed.data.fulfilment_details,updated_at:new Date().toISOString()});
  if (privateError) return { ok: false, error: "save" };
  revalidatePath("/marketplace");
  revalidatePath("/dashboard");
  return { ok: true };
}


export async function updateListingStatus(formData: FormData) {
  const listingId = String(formData.get("listing_id") || "");
  const status = String(formData.get("status") || "");
  if (!/^[0-9a-f-]{36}$/i.test(listingId) || !["active", "paused"].includes(status)) {
    redirect("/dashboard?error=listing");
  }

  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "farmer") redirect("/dashboard?error=role");

  const { data, error } = await supabase.from("produce_listings")
    .update({ status: status as "active" | "paused", updated_at: new Date().toISOString() })
    .eq("id", listingId)
    .eq("farmer_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) redirect("/dashboard?error=listing");
  revalidatePath("/dashboard");
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${listingId}`);
  redirect("/dashboard?listing_updated=1");
}
