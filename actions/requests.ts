"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  listing_id: z.string().uuid(),
  quantity_requested: z.coerce.number().positive(),
  proposed_price: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  message: z.string().trim().max(500).optional(),
});

export async function createBuyerRequest(formData: FormData) {
  const parsed = requestSchema.safeParse({
    listing_id: formData.get("listing_id"),
    quantity_requested: formData.get("quantity_requested"),
    proposed_price: formData.get("proposed_price") || "",
    message: formData.get("message") || "",
  });
  if (!parsed.success) redirect("/marketplace?error=request");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "buyer") redirect("/marketplace?error=buyer_only");

  const { data: listing } = await supabase.from("produce_listings")
    .select("quantity_available,reserved_quantity,quantity_sold,status")
    .eq("id", parsed.data.listing_id).single();
  if (!listing || listing.status !== "active") redirect("/marketplace?error=unavailable");
  const available = Number(listing.quantity_available) - Number(listing.reserved_quantity) - Number(listing.quantity_sold);
  if (parsed.data.quantity_requested > available) redirect(`/marketplace/${parsed.data.listing_id}?error=quantity`);

  const { error } = await supabase.from("buyer_requests").insert({
    listing_id: parsed.data.listing_id,
    buyer_id: user.id,
    quantity_requested: parsed.data.quantity_requested,
    proposed_price: parsed.data.proposed_price === "" ? null : parsed.data.proposed_price,
    message: parsed.data.message || null,
  });
  if (error) redirect(`/marketplace/${parsed.data.listing_id}?error=request`);

  revalidatePath("/dashboard");
  redirect("/dashboard?requested=1");
}
