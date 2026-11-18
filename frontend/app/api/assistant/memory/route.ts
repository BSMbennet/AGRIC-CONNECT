import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const preferenceSchema = z.object({ enabled: z.boolean() });
const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  // The assistant-memory tables are introduced by a staged migration and may not
  // exist in the generated Database type yet. Keep the escape hatch typed.
  return { supabase: supabase as unknown as SupabaseClient, user: error ? null : user };
}

export async function GET() {
  const { supabase, user } = await authenticatedClient();
  if (!user) return fail("Sign in to access your assistant memory.", 401);
  const { data: preference, error: preferenceError } = await supabase
    .from("agri_ai_memory_preferences").select("enabled,consented_at").eq("user_id", user.id).maybeSingle();
  if (preferenceError) return fail("Assistant memory is not available yet. Apply the feature-branch database migration first.", 503);
  const enabled = preference?.enabled === true;
  if (!enabled) return NextResponse.json({ enabled: false, messages: [] });
  const { data: conversation, error: conversationError } = await supabase
    .from("agri_ai_conversations").select("id,language").eq("user_id", user.id).maybeSingle();
  if (conversationError) return fail("Could not load your saved assistant conversation.", 503);
  if (!conversation) return NextResponse.json({ enabled: true, messages: [] });
  const { data: messages, error: messagesError } = await supabase
    .from("agri_ai_messages").select("role,content,created_at").eq("user_id", user.id)
    .eq("conversation_id", conversation.id).order("created_at", { ascending: true }).limit(80);
  if (messagesError) return fail("Could not load your saved assistant messages.", 503);
  return NextResponse.json({ enabled: true, language: conversation.language, messages: messages ?? [] });
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await authenticatedClient();
  if (!user) return fail("Sign in to update assistant memory settings.", 401);
  let body: unknown;
  try { body = await request.json(); } catch { return fail("Invalid request body.", 400); }
  const parsed = preferenceSchema.safeParse(body);
  if (!parsed.success) return fail("Choose whether AGRIC AI may save conversation history.", 400);

  const enabled = parsed.data.enabled;
  const { error } = await supabase.from("agri_ai_memory_preferences").upsert({
    user_id: user.id,
    enabled,
    consented_at: enabled ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if (error) return fail("Could not save your memory preference. Apply the feature-branch database migration first.", 503);

  if (!enabled) {
    const { error: deleteError } = await supabase.from("agri_ai_conversations").delete().eq("user_id", user.id);
    if (deleteError) return fail("Memory was disabled, but saved messages could not be cleared. Please retry Clear conversation.", 503);
  }
  return NextResponse.json({ enabled, deleted: !enabled });
}

export async function DELETE() {
  const { supabase, user } = await authenticatedClient();
  if (!user) return fail("Sign in to clear assistant memory.", 401);
  const { error } = await supabase.from("agri_ai_conversations").delete().eq("user_id", user.id);
  if (error) return fail("Could not delete saved assistant messages.", 503);
  return NextResponse.json({ cleared: true });
}
