import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { CartPageClient } from "@/components/cart-page-client";

type ActiveOrder = {
  id: string;
  status: string;
  created_at: string;
  unit: string;
};

export default async function CartPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cart");

  const [{ data: profile }, { data: listings }, { data: activeOrders }, { data: pendingRequests }] = await Promise.all([
    supabase.from("profiles").select("display_name,phone_e164,role").eq("id", user.id).maybeSingle(),
    supabase.from("produce_listings")
      .select("id,produce_name,asking_price,price_unit,unit,quantity_available,reserved_quantity,quantity_sold,locality")
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .limit(1000),
    supabase.from("orders")
      .select("id,status,created_at,unit")
      .eq("buyer_id", user.id)
      .in("status", ["accepted", "fulfilled"])
      .order("created_at", { ascending: false }),
    supabase.from("buyer_requests")
      .select("id,listing_id,quantity_requested,created_at,request_type")
      .eq("buyer_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  if (profile?.role !== "buyer") {
    return <main className="min-h-screen agri-page scene-market"><AppNav active="cart"/><section className="mx-auto max-w-3xl px-5 py-10"><h1 className="text-3xl font-bold text-forest">Buyer cart</h1><p className="mt-3 text-slate-600">Switch to a buyer account to prepare purchase requests.</p></section></main>;
  }

  const items = (listings ?? [])
    .map((x) => ({ ...x, available: Math.max(0, Number(x.quantity_available) - Number(x.reserved_quantity) - Number(x.quantity_sold)) }))
    .filter((x) => x.available > 0);

  const orderIds = (activeOrders ?? []).map((order) => order.id);
  let allocations: Array<{ order_id: string; quantity_allocated: number | string; agreed_unit_price: number | string }> = [];
  let payments: Array<{ order_id: string; amount_minor: number | string; status: string }> = [];
  if (orderIds.length) {
    const [allocationResult, paymentResult] = await Promise.all([
      supabase.from("order_allocations").select("order_id,quantity_allocated,agreed_unit_price").in("order_id", orderIds),
      supabase.from("order_payments").select("order_id,amount_minor,status").in("order_id", orderIds),
    ]);
    allocations = (allocationResult.data ?? []) as typeof allocations;
    payments = (paymentResult.data ?? []) as typeof payments;
  }

  const unpaidOrders = ((activeOrders ?? []) as ActiveOrder[]).map((order) => {
    const orderAllocations = (allocations ?? []).filter((allocation) => allocation.order_id === order.id);
    const totalMinor = Math.round(orderAllocations.reduce(
      (sum, allocation) => sum + Number(allocation.quantity_allocated) * Number(allocation.agreed_unit_price), 0
    ) * 100);
    const paidMinor = (payments ?? []).filter((payment) => payment.order_id === order.id && payment.status === "paid")
      .reduce((sum, payment) => sum + Number(payment.amount_minor), 0);
    const depositMinor = Math.max(50, Math.round(totalMinor * 0.25));
    return { ...order, totalMinor, paidMinor, depositMinor, balanceMinor: Math.max(0, totalMinor - paidMinor) };
  }).filter((order) => order.totalMinor > 0 && order.paidMinor < order.totalMinor);

  const pendingListingIds = [...new Set((pendingRequests ?? []).map((request) => request.listing_id))];
  const { data: pendingListings } = pendingListingIds.length
    ? await supabase.from("produce_listings").select("id,produce_name,unit").in("id", pendingListingIds)
    : { data: [] };
  const pendingListingMap = new Map((pendingListings ?? []).map((listing) => [listing.id, listing]));

  const zar = (minor: number) => (minor / 100).toLocaleString("en-ZA", { style: "currency", currency: "ZAR" });

  return (
    <main className="min-h-screen agri-page">
      <AppNav active="cart"/>
      <section className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-sm font-semibold text-leaf">Marketplace</p>
        <h1 className="mt-2 text-3xl font-bold text-forest">Buyer cart</h1>
        <p className="mt-2 text-sm text-slate-600">Your requests and accepted orders stay visible here until the agreed order amount is fully paid.</p>
        <div className="mt-4"><Link href="/orders" className="inline-flex rounded-full border border-emerald-900/20 bg-white px-4 py-2 text-sm font-bold text-forest hover:border-leaf hover:bg-emerald-50">View my orders & transaction history →</Link></div>

        {(pendingRequests?.length ?? 0) > 0 && <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-forest">Waiting for farmer confirmation</h2>
          <p className="mt-1 text-xs leading-5 text-amber-900">These requests remain active while the farmer confirms stock and the final price. No deposit is collected until the order is accepted.</p>
          <div className="mt-3 space-y-2">
            {pendingRequests!.map((request) => {
              const listing = pendingListingMap.get(request.listing_id);
              return <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm">
                <div><p className="font-semibold text-forest">{listing?.produce_name ?? "Marketplace product"}</p><p className="text-xs text-slate-500">{Number(request.quantity_requested).toLocaleString()} {listing?.unit ?? "units"} · {request.request_type === "preorder" ? "Pre-order" : "Available stock"}</p></div>
                <span className="text-xs font-semibold text-amber-800">Awaiting acceptance</span>
              </div>;
            })}
          </div>
        </section>}

        {unpaidOrders.length > 0 && <section className="mt-6 rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-forest">Orders awaiting final payment</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">Your accepted orders remain in this section until Stripe confirms the deposit and final balance. Completed payments are verified by the secure webhook.</p>
          <div className="mt-4 space-y-3">
            {unpaidOrders.map((order) => {
              const canPayDeposit = order.paidMinor === 0;
              const canPayBalance = order.status === "fulfilled" && order.paidMinor >= order.depositMinor && order.balanceMinor > 0;
              return <article key={order.id} className="rounded-xl border border-emerald-900/10 bg-[#f7faf7] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-bold text-forest">Order {order.id.slice(0, 8)}</p><p className="text-xs capitalize text-slate-500">{order.status.replaceAll("_", " ")} · {new Date(order.created_at).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}</p></div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{canPayDeposit ? "Deposit due" : order.balanceMinor > 0 ? "Balance outstanding" : "Paid"}</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <p>Total: <strong>{zar(order.totalMinor)}</strong></p>
                  <p>Paid: <strong>{zar(order.paidMinor)}</strong></p>
                  <p>Still due: <strong>{zar(order.balanceMinor)}</strong></p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {canPayDeposit && <form action={`/api/orders/${order.id}/checkout`} method="post"><input type="hidden" name="payment_kind" value="deposit"/><button className="rounded-lg bg-forest px-4 py-2 text-xs font-bold text-white">Pay 25% deposit · {zar(order.depositMinor)}</button></form>}
                  {canPayBalance && <form action={`/api/orders/${order.id}/checkout`} method="post"><input type="hidden" name="payment_kind" value="balance"/><button className="rounded-lg bg-forest px-4 py-2 text-xs font-bold text-white">Pay remaining balance · {zar(order.balanceMinor)}</button></form>}
                  {!canPayDeposit && !canPayBalance && <p className="text-xs text-slate-600">The remaining balance becomes payable when the farmer marks the order ready for collection or delivery.</p>}
                  <Link href={`/orders/${order.id}`} className="text-xs font-bold text-leaf underline">View order and payment history →</Link>
                </div>
              </article>;
            })}
          </div>
        </section>}

        <div className="mt-6">
          <CartPageClient listings={items} defaultName={profile.display_name ?? ""} defaultPhone={profile.phone_e164 ?? ""}/>
        </div>
      </section>
    </main>
  );
}
