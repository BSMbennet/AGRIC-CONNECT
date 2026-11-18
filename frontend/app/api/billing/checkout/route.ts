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
    return NextResponse.redirect(new URL("/subscriptions?error=billing_not_configured", request.url), 303);
  }

  try {
    const response = await fetch(integrationUrl + "/v1/checkout/subscriptions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.access_token,
        "X-Integration-Token": integrationToken,
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
  }
}
