import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function redirectToOrder(request: NextRequest, orderId: string, query: string) {
  return NextResponse.redirect(new URL("/orders/" + orderId + query, request.url), 303);
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const orderId = String(form.get("order_id") || "");
  const paymentKind = String(form.get("payment_kind") || "");

  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !["deposit", "balance"].includes(paymentKind)) {
    return NextResponse.redirect(new URL("/dashboard?payment_error=invalid_request", request.url), 303);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/orders/" + orderId, request.url), 303);
  }

  const [{ data: sessionData }, { data: profile }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  const accessToken = sessionData.session?.access_token;
  if (!accessToken || profile?.role !== "buyer") {
    return redirectToOrder(request, orderId, "?payment_error=buyer_only");
  }

  const { data: order } = await supabase.from("orders")
    .select("id,buyer_id,status,currency,delivery_confirmed_at")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (!order) return redirectToOrder(request, orderId, "?payment_error=order_not_found");
  if (!["accepted", "fulfilled"].includes(order.status) || order.delivery_confirmed_at) {
    return redirectToOrder(request, orderId, "?payment_error=order_not_payable");
  }
  if (order.currency !== "ZAR") return redirectToOrder(request, orderId, "?payment_error=unsupported_currency");

  const integrationUrl = process.env.INTEGRATION_API_URL?.replace(/\/+$/, "");
  if (!integrationUrl || !integrationUrl.startsWith("https://")) {
    return redirectToOrder(request, orderId, "?payment_error=payment_service_unavailable");
  }

  try {
    const response = await fetch(integrationUrl + "/payments/checkout", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ order_id: orderId, payment_kind: paymentKind }),
      cache: "no-store",
    });
    const result = await response.json() as { status?: string; checkout_url?: string };

    if (response.ok && result.status === "open" && result.checkout_url?.startsWith("https://checkout.stripe.com/")) {
      return NextResponse.redirect(result.checkout_url, 303);
    }
    if (response.ok && ["paid", "processing"].includes(result.status || "")) {
      return redirectToOrder(request, orderId, "?payment=processing");
    }

    console.error("Render marketplace Checkout adapter returned", response.status);
    return redirectToOrder(request, orderId, "?payment_error=checkout_failed");
  } catch (error) {
    console.error("Render marketplace Checkout adapter unavailable", error instanceof Error ? error.message : "unknown");
    return redirectToOrder(request, orderId, "?payment_error=payment_service_unavailable");
  }
}
