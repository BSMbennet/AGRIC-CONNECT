import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type StripeSubscriptionObject = {
  id?: string;
  metadata?: Record<string, string | undefined>;
  customer?: string | null;
  status?: string;
  current_period_end?: number;
};
type StripeWebhookEvent = {
  id?: string;
  type?: string;
  livemode?: boolean;
  data?: { object?: StripeSubscriptionObject };
};

function verify(payload: string, header: string, secret: string) {
  const fields = header.split(",").map((part) => part.split("=", 2));
  const timestamp = fields.find(([key]) => key === "t")?.[1];
  const signatures = fields.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !Number.isFinite(Number(timestamp)) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(timestamp + "." + payload).digest();
  return signatures.some((value) => {
    const actual = Buffer.from(value, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!secret || !url || !serviceKey) {
    return NextResponse.json({ error: "Subscription webhook configuration missing" }, { status: 503 });
  }

  const payload = await request.text();
  if (!verify(payload, request.headers.get("stripe-signature") || "", secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(payload) as StripeWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.livemode !== false) return NextResponse.json({ error: "Live-mode events are disabled" }, { status: 403 });

  const eventType = event.type || "";
  if (!["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(eventType)) {
    return NextResponse.json({ received: true });
  }

  const subscription = event.data?.object;
  if (!subscription?.id) return NextResponse.json({ error: "Subscription ID missing" }, { status: 400 });
  const farmerId = subscription.metadata?.farmer_id;
  const plan = subscription.metadata?.plan;
  if (!farmerId || (plan !== "pro" && plan !== "premium")) {
    return NextResponse.json({ error: "Subscription metadata missing" }, { status: 400 });
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await db.from("farmer_subscriptions").upsert({
    farmer_id: farmerId,
    plan,
    status: eventType === "customer.subscription.deleted" ? "canceled" : subscription.status || "incomplete",
    stripe_customer_id: String(subscription.customer || ""),
    stripe_subscription_id: subscription.id,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" });

  if (error) return NextResponse.json({ error: "Subscription persistence failed" }, { status: 500 });
  return NextResponse.json({ received: true });
}
