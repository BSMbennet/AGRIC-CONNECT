"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const farmerSchema = z.object({
  display_name: z.string().trim().min(2).max(80),
  phone_e164: z.string().trim().max(20).optional(),
  locality: z.string().trim().min(2).max(100),
  municipality: z.string().trim().max(100).optional(),
  district: z.string().trim().min(2).max(100),
  preferred_language: z.enum(["en", "ve"]),
  consent: z.literal("on"),
});

export async function registerFarmerForMember(formData: FormData) {
  const parsed = farmerSchema.safeParse({
    display_name: formData.get("display_name"),
    phone_e164: formData.get("phone_e164") || undefined,
    locality: formData.get("locality"),
    municipality: formData.get("municipality") || undefined,
    district: formData.get("district"),
    preferred_language: formData.get("preferred_language"),
    consent: formData.get("consent"),
  });
  if (!parsed.success) redirect("/agent/register-farmer?error=invalid");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: agent } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (agent?.role !== "agent") redirect("/dashboard");

  const admin = createAdminClient();
  const placeholderEmail = `farmer-${crypto.randomUUID()}@no-email.agriconnect.invalid`;
  const temporaryPassword = `${crypto.randomUUID()}A9!`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: placeholderEmail,
    password: temporaryPassword,
    email_confirm: true,
  });
  if (createError || !created.user) redirect("/agent/register-farmer?error=create");

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    role: "farmer",
    display_name: parsed.data.display_name,
    phone_e164: parsed.data.phone_e164 || null,
    locality: parsed.data.locality,
    municipality: parsed.data.municipality || null,
    district: parsed.data.district,
    preferred_language: parsed.data.preferred_language,
    onboarding_status: "agent_assisted",
    created_by_agent_id: user.id,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    redirect("/agent/register-farmer?error=profile");
  }

  const { error: consentError } = await admin.from("consents").insert({
    profile_id: created.user.id,
    consent_type: "account",
    consent_version: "v1",
    granted: true,
    method: "agent_in_person",
  });
  if (consentError) {
    await admin.auth.admin.deleteUser(created.user.id);
    redirect("/agent/register-farmer?error=consent");
  }
  redirect("/agent/register-farmer?created=1");
}
