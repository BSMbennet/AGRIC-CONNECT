"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  role: z.enum(["farmer", "buyer"]),
  phone: z.string().trim().max(20).optional(),
  locality: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  consent: z.literal("on"),
});

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/login?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/login?error=credentials");
  redirect("/dashboard");
}

export async function register(formData: FormData) {
  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    phone: formData.get("phone") || undefined,
    locality: formData.get("locality"),
    district: formData.get("district"),
    consent: formData.get("consent"),
  });
  if (!parsed.success) redirect("/register?error=invalid");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) redirect("/register?error=signup");

  // Trusted profile fields are written server-side; public user metadata never determines roles.
  const admin = createAdminClient();
  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    role: parsed.data.role,
    display_name: parsed.data.displayName,
    phone_e164: parsed.data.phone || null,
    district: parsed.data.district,
    locality: parsed.data.locality,
    preferred_language: "en",
  });
  if (profileError) redirect("/register?error=profile");

  const { error: consentError } = await admin.from("consents").insert({
    profile_id: data.user.id,
    consent_type: "account",
    consent_version: "v1",
    granted: true,
    method: "web_form",
  });
  if (consentError) redirect("/register?error=consent");

  redirect("/login?registered=1");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
