"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const languageSchema = z.enum(["en", "ve"]);

export async function updatePreferredLanguage(value: string) {
  const parsed = languageSchema.safeParse(value);
  if (!parsed.success) return { ok: false };
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", parsed.data, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { error } = await supabase.from("profiles").update({ preferred_language: parsed.data }).eq("id", user.id);
    if (error) return { ok: false };
  }
  return { ok: true };
}
