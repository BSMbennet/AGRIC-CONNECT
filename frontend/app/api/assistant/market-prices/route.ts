import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { marketIntelligenceSource } from "@/lib/assistant/live-agricultural-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Sign in to access market intelligence." }, { status: 401 });
  const commodity = (request.nextUrl.searchParams.get("commodity") ?? "").trim().slice(0, 80);
  return NextResponse.json({
    commodity: commodity || null,
    retrievedAt: new Date().toISOString(),
    status: "report_dashboard_only",
    numericPricesAvailable: false,
    message: marketIntelligenceSource.limitation,
    source: marketIntelligenceSource
  });
}
