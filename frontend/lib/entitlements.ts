import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Premium analytics are unlocked by an active/trialing Pro or Premium farmer subscription.
 * Cooperative managers are not entitled until a Cooperative plan exists (product decision pending).
 * Enforced on the server: locked users never receive the chart data.
 */
export async function hasPremiumAnalytics(supabase: SupabaseClient, userId: string, role: string): Promise<boolean> {
  if (role !== "farmer") return false;
  const { data } = await supabase.from("farmer_subscriptions").select("plan")
    .eq("farmer_id", userId).in("status", ["active", "trialing"]).gt("current_period_end", new Date().toISOString())
    .in("plan", ["pro", "premium"]).limit(1).maybeSingle();
  return Boolean(data);
}
