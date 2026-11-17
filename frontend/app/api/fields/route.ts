import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().max(max).nullable()
);

const fieldSchema = z.object({
  field_name: z.string().trim().min(2).max(80),
  locality: z.string().trim().min(2).max(100),
  soil_texture: z.enum(["sandy", "sandy_loam", "loamy", "clay_loam", "clay", "unknown"]),
  drainage: z.enum(["well_drained", "moderate", "poor", "unknown"]),
  soil_ph: z.preprocess(
    (value) => value === "" || value === undefined ? null : Number(value),
    z.number().min(3).max(10).nullable()
  ),
  soil_ph_source: z.enum(["lab_tested", "farmer_estimate", "not_tested"]),
  soil_test_date: optionalText(10),
  previous_crop: optionalText(80),
  field_notes: optionalText(2000)
}).superRefine((value, context) => {
  if (value.soil_ph === null && value.soil_ph_source !== "not_tested") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["soil_ph_source"], message: "Choose not tested when no pH value is supplied." });
  }
  if (value.soil_ph !== null && value.soil_ph_source === "not_tested") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["soil_ph_source"], message: "Choose how the pH value was obtained." });
  }
  if (value.soil_test_date && !/^\d{4}-\d{2}-\d{2}$/.test(value.soil_test_date)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["soil_test_date"], message: "Enter a valid test date." });
  }
});

const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });

async function getFarmerClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: fail("Sign in to manage your field profile.", 401) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "farmer") return { error: fail("Field profiles are currently available to farmer accounts.", 403) };
  return { supabase, user };
}

export async function GET() {
  const auth = await getFarmerClient();
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.supabase
    .from("farm_field_profiles")
    .select("id,field_name,locality,soil_texture,drainage,soil_ph,soil_ph_source,soil_test_date,previous_crop,field_notes,created_at,updated_at")
    .eq("farmer_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return fail("Your field profiles could not be loaded.", 500);
  return NextResponse.json({ fields: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await getFarmerClient();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return fail("Send a valid field profile.", 400); }

  const parsed = fieldSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the field details and try again.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("farm_field_profiles")
    .insert({ ...parsed.data, farmer_id: auth.user.id })
    .select("id,field_name,locality,soil_texture,drainage,soil_ph,soil_ph_source,soil_test_date,previous_crop,field_notes,created_at,updated_at")
    .single();

  if (error || !data) return fail("The field profile could not be saved. Check that the Field Truth database migration has been applied.", 500);
  return NextResponse.json({ field: data }, { status: 201 });
}
