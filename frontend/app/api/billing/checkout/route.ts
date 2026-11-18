import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/subscriptions", request.url), 303);

  const form = await request.formData();
  const plan = String(form.get("plan") || "");
  if (!["pro", "premium"].includes(plan)) {
    return NextResponse.redirect(new URL("/subscriptions?error=invalid_plan", request.url), 303);
  }

  const { data: { session } } = await supabase.auth.getSession();
  const integrationUrl = process.env.RENDER_INTEGRATION_URL?.replace(/\/+$/, "");
  const integrationToken = process.env.AGRIC_CONNECT_INTERNAL_TOKEN;
  if (!session?.access_token || !integrationUrl || !integrationToken) {
  const [{ data: sessionData }, { data: profile }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  if (!sessionData.session?.access_token || profile?.role !== "farmer") {
    return NextResponse.redirect(new URL("/dashboard", request.url), 303);
  }

  const form = await request.formData();
  const plan = String(form.get("plan") || "");
  if (plan !== "pro" && plan !== "premium") {
    return NextResponse.redirect(new URL("/subscriptions?error=invalid_plan", request.url), 303);
  }

  const { data: active } = await supabase.from("farmer_subscriptions").select("id")
    .eq("farmer_id", user.id)
    .in("status", ["active", "trialing"])
    .gt("current_period_end", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  if (active) return NextResponse.redirect(new URL("/subscriptions?error=already_subscribed", request.url), 303);

  const integrationUrl = process.env.INTEGRATION_API_URL?.replace(/\/+$/, "");
  if (!integrationUrl || !integrationUrl.startsWith("https://")) {
    return NextResponse.redirect(new URL("/subscriptions?error=billing_not_configured", request.url), 303);
  }

  try {
    const response = await fetch(integrationUrl + "/v1/checkout/subscriptions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.access_token,
        "X-Integration-Token": integrationToken,
    const response = await fetch(integrationUrl + "/subscriptions/checkout", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + sessionData.session.access_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan }),
      cache: "no-store",
    });
    const body = await response.json() as { checkout_url?: string };
    if (!response.ok || !body.checkout_url) {
      const reason = response.status === 409 ? "already_subscribed" : "checkout_failed";
      return NextResponse.redirect(new URL("/subscriptions?error=" + reason, request.url), 303);
    }
    const checkoutUrl = new URL(body.checkout_url);
    if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.stripe.com") {
      return NextResponse.redirect(new URL("/subscriptions?error=checkout_failed", request.url), 303);
    }
    return NextResponse.redirect(checkoutUrl, 303);
  } catch {
    return NextResponse.redirect(new URL("/subscriptions?error=billing_unavailable", request.url), 303);
    const result = await response.json() as { checkout_url?: string };

    if (response.ok && result.checkout_url?.startsWith("https://checkout.stripe.com/")) {
      return NextResponse.redirect(result.checkout_url, 303);
    }
    console.error("Render farmer subscription adapter returned", response.status);
    return NextResponse.redirect(new URL("/subscriptions?error=checkout_failed", request.url), 303);
  } catch (error) {
    console.error("Render farmer subscription adapter unavailable", error instanceof Error ? error.message : "unknown");
    return NextResponse.redirect(new URL("/subscriptions?error=billing_not_configured", request.url), 303);
  }
}
