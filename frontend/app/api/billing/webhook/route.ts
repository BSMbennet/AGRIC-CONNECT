import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const integrationUrl = process.env.INTEGRATION_API_URL?.replace(/\/+$/, "");
  if (!integrationUrl || !integrationUrl.startsWith("https://")) {
    return NextResponse.json({ error: "Render Stripe webhook adapter is not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Stripe-Signature header is required" }, { status: 400 });

  try {
    const response = await fetch(integrationUrl + "/webhooks/stripe", {
      method: "POST",
      headers: {
        "Stripe-Signature": signature,
        "Content-Type": request.headers.get("content-type") || "application/json",
      },
      body: await request.arrayBuffer(),
      cache: "no-store",
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    console.error("Render Stripe webhook adapter unavailable", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Stripe event forwarding failed" }, { status: 502 });
  }
}
