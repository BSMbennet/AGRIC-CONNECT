import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.redirect(new URL("/orders?payment_error=1", request.url), 303);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/orders/" + id, request.url), 303);
  const { data: { session } } = await supabase.auth.getSession();
  const form = await request.formData();
  const paymentKind = String(form.get("payment_kind") || "");
  if (!session?.access_token || !["deposit", "balance"].includes(paymentKind)) {
    return NextResponse.redirect(new URL("/orders/" + id + "?payment_error=1", request.url), 303);
  }

  const integrationUrl = process.env.RENDER_INTEGRATION_URL?.replace(/\/+$/, "");
  const integrationToken = process.env.AGRIC_CONNECT_INTERNAL_TOKEN;
  if (!integrationUrl || !integrationToken) {
    return NextResponse.redirect(new URL("/orders/" + id + "?payment_error=1", request.url), 303);
  }

  try {
    const response = await fetch(integrationUrl + "/v1/checkout/orders/" + id, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.access_token,
        "X-Integration-Token": integrationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payment_kind: paymentKind }),
      cache: "no-store",
    });
    const body = await response.json() as { checkout_url?: string };
    if (!response.ok || !body.checkout_url) {
      return NextResponse.redirect(new URL("/orders/" + id + "?payment_error=1", request.url), 303);
    }
    const checkoutUrl = new URL(body.checkout_url);
    if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.stripe.com") {
      return NextResponse.redirect(new URL("/orders/" + id + "?payment_error=1", request.url), 303);
    }
    return NextResponse.redirect(checkoutUrl, 303);
  } catch {
    return NextResponse.redirect(new URL("/orders/" + id + "?payment_error=1", request.url), 303);
  }
}
