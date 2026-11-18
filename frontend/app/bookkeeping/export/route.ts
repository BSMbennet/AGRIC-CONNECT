import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadTransactions } from "@/lib/bookkeeping/load";
import { CATEGORY_LABELS } from "@/lib/bookkeeping/schema";
import { periodRange, todayInJohannesburg, toCsv, type Period } from "@/lib/bookkeeping/reports";

export const runtime = "nodejs";

/** CSV export of the signed-in user's own entries; opens directly in Excel. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/bookkeeping", request.url), 303);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["farmer", "cooperative_manager"].includes(profile.role)) return new NextResponse("Forbidden", { status: 403 });

  const p = request.nextUrl.searchParams.get("period");
  const period = (["day", "week", "month", "year"].includes(p ?? "") ? p : "month") as Period;
  const range = periodRange(period, todayInJohannesburg());
  const txs = await loadTransactions(supabase, user.id, range);
  return new NextResponse(toCsv(txs, CATEGORY_LABELS), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="agricnorthx-${period}-${range.from}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
