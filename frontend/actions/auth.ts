"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.displayName,
        role: parsed.data.role,
        phone_e164: parsed.data.phone || null,
        locality: parsed.data.locality,
        district: parsed.data.district,
        preferred_language: "en",
        account_consent: true,
      },
    },
  });
  if (error) redirect("/register?error=signup");

  // The database trigger creates the profile and consent record transactionally.
  // Public signup metadata is constrained by the trigger to farmer/buyer roles only.
  redirect("/login?registered=1");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
