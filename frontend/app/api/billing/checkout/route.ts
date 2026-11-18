import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function subscriptionRedirect(request: NextRequest, query: string) {
  return NextResponse.redirect(new URL("/subscriptions" + query, request.url), 303);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/subscriptions", request.url), 303);
  }

  const [{ data: sessionData }, { data: profile }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  const accessToken = sessionData.session?.access_token;
  if (!accessToken || profile?.role !== "farmer") {
    return NextResponse.redirect(new URL("/dashboard", request.url), 303);
  }

  const form = await request.formData();
  const plan = String(form.get("plan") || "");
  if (plan !== "pro" && plan !== "premium") {
    return subscriptionRedirect(request, "?error=invalid_plan");
  }

  const { data: active } = await supabase.from("farmer_subscriptions").select("id")
    .eq("farmer_id", user.id)
    .in("status", ["active", "trialing"])
    .gt("current_period_end", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  if (active) return subscriptionRedirect(request, "?error=already_subscribed");

  const integrationUrl = process.env.RENDER_INTEGRATION_URL?.replace(/\/+$/, "");
  const integrationToken = process.env.AGRIC_CONNECT_INTERNAL_TOKEN;
  if (!integrationUrl || !integrationUrl.startsWith("https://") || !integrationToken) {
    return subscriptionRedirect(request, "?error=billing_not_configured");
  }

  try {
    const response = await fetch(integrationUrl + "/v1/checkout/subscriptions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "X-Integration-Token": integrationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan }),
      cache: "no-store",
    });

    const result = await response.json() as { checkout_url?: string };
    if (!response.ok || !result.checkout_url) {
      const reason = response.status === 409 ? "already_subscribed" : "checkout_failed";
      return subscriptionRedirect(request, "?error=" + reason);
    }

    const checkoutUrl = new URL(result.checkout_url);
    if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.stripe.com") {
      return subscriptionRedirect(request, "?error=checkout_failed");
    }
    return NextResponse.redirect(checkoutUrl, 303);
  } catch (error) {
    console.error("Render subscription Checkout request failed", error instanceof Error ? error.message : "unknown");
    return subscriptionRedirect(request, "?error=billing_unavailable");
  }
}
