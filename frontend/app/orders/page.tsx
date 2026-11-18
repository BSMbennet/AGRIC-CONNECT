import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/server";

type OrderRow = {
  id: string;
  status: string;
  created_at: string;
  currency: string | null;
  fulfilment_state: string | null;
  delivery_confirmed_at: string | null;
};
type AllocationRow = {
  order_id: string;
  quantity_allocated: number | string;
  agreed_unit_price: number | string;
  produce_listings: { produce_name?: string } | { produce_name?: string }[] | null;
};
type PaymentRow = {
  order_id: string;
  amount_minor: number | string;
  currency: string;
  status: string;
  payment_kind: string;
  paid_at: string | null;
};

const money = (minor: number, currency = "ZAR") =>
  (minor / 100).toLocaleString("en-ZA", { style: "currency", currency });

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; payment_error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/orders");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "buyer") redirect("/dashboard");

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id,status,created_at,currency,fulfilment_state,delivery_confirmed_at")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const orderIds = (orders ?? []).map((order) => order.id);
  const [{ data: allocations }, { data: payments }] = orderIds.length
    ? await Promise.all([
        supabase.from("order_allocations")
          .select("order_id,quantity_allocated,agreed_unit_price,produce_listings(produce_name)")
          .in("order_id", orderIds),
        supabase.from("order_payments")
          .select("order_id,amount_minor,currency,status,payment_kind,paid_at")
          .in("order_id", orderIds)
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

  const allocationRows = (allocations ?? []) as unknown as AllocationRow[];
  const paymentRows = (payments ?? []) as unknown as PaymentRow[];
  const allocationsByOrder = new Map<string, AllocationRow[]>();
  for (const allocation of allocationRows) {
    allocationsByOrder.set(allocation.order_id, [...(allocationsByOrder.get(allocation.order_id) ?? []), allocation]);
  }
  const paymentsByOrder = new Map<string, PaymentRow[]>();
  for (const payment of paymentRows) {
    paymentsByOrder.set(payment.order_id, [...(paymentsByOrder.get(payment.order_id) ?? []), payment]);
  }

  return (
    <main className="min-h-screen agri-page scene-harvest">
      <AppNav active="dashboard" />
      <section className="mx-auto max-w-5xl px-5 py-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-leaf">Buyer account</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-forest">My orders & transaction history</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Every order stays in your account after checkout, payment, collection or delivery. Paid orders are kept here as historical transactions.</p>
          </div>
          <Link href="/marketplace" className="rounded-full bg-forest px-5 py-3 text-sm font-bold text-white hover:bg-leaf">Browse marketplace</Link>
        </div>

        {params.payment === "returned" && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">You returned from checkout. Payment history updates after Stripe confirms the payment through its signed webhook.</p>}
        {params.payment_error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">Checkout could not be started. Open the order and try again.</p>}

        <div className="mt-7 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
          <span className="rounded-full bg-white px-3 py-2 shadow-sm">{orders?.length ?? 0} orders saved</span>
          <span className="rounded-full bg-white px-3 py-2 shadow-sm">{paymentRows.filter((payment) => payment.status === "paid").length} successful payment entries</span>
        </div>

        {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Your order history could not be loaded. Please refresh the page.</div>}
        {!error && !orders?.length && <div className="mt-6 rounded-3xl border border-dashed border-emerald-900/20 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-bold text-forest">Your transaction history starts here</h2>
          <p className="mt-2 text-sm text-slate-500">Orders you place from the marketplace will remain available here, including completed and paid orders.</p>
          <Link href="/marketplace" className="mt-5 inline-flex rounded-full bg-forest px-5 py-3 text-sm font-bold text-white hover:bg-leaf">Find produce</Link>
        </div>}

        <div className="mt-6 space-y-4">
          {(orders ?? []).map((order: OrderRow) => {
            const orderAllocations = allocationsByOrder.get(order.id) ?? [];
            const orderPayments = paymentsByOrder.get(order.id) ?? [];
            const totalMinor = Math.round(orderAllocations.reduce(
              (sum, row) => sum + Number(row.quantity_allocated) * Number(row.agreed_unit_price), 0
            ) * 100);
            const paidMinor = orderPayments.filter((payment) => payment.status === "paid")
              .reduce((sum, payment) => sum + Number(payment.amount_minor), 0);
            const names = [...new Set(orderAllocations.map((row) => {
              const listing = Array.isArray(row.produce_listings) ? row.produce_listings[0] : row.produce_listings;
              return listing?.produce_name;
            }).filter(Boolean))];
            const isPaid = totalMinor > 0 && paidMinor >= totalMinor;
            const statusLabel = isPaid ? "Paid" : paidMinor > 0 ? "Partially paid" : order.status.replaceAll("_", " ");
            return (
              <article key={order.id} className="rounded-3xl border border-emerald-900/10 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Order {order.id.slice(0, 8)}</p>
                    <h2 className="mt-1 text-lg font-extrabold text-forest">{names.length ? names.join(", ") : "Produce order"}</h2>
                    <p className="mt-1 text-xs text-slate-500">Placed {new Date(order.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${isPaid ? "bg-emerald-100 text-emerald-800" : paidMinor > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{statusLabel}</span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#f7faf7] p-3"><p className="text-xs text-slate-500">Order total</p><p className="mt-1 font-bold text-forest">{money(totalMinor, order.currency ?? "ZAR")}</p></div>
                  <div className="rounded-xl bg-[#f7faf7] p-3"><p className="text-xs text-slate-500">Paid to date</p><p className="mt-1 font-bold text-forest">{money(paidMinor, order.currency ?? "ZAR")}</p></div>
                  <div className="rounded-xl bg-[#f7faf7] p-3"><p className="text-xs text-slate-500">Balance</p><p className="mt-1 font-bold text-forest">{money(Math.max(0, totalMinor - paidMinor), order.currency ?? "ZAR")}</p></div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    <span className="capitalize">{order.fulfilment_state?.replaceAll("_", " ") ?? order.status.replaceAll("_", " ")}</span>
                    {order.delivery_confirmed_at && <span> · Received {new Date(order.delivery_confirmed_at).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}</span>}
                    <span> · {orderPayments.length} payment record{orderPayments.length === 1 ? "" : "s"}</span>
                  </div>
                  <Link href={`/orders/${order.id}`} className="rounded-xl border border-emerald-900/20 px-4 py-2.5 text-sm font-bold text-forest hover:border-leaf hover:bg-emerald-50">{isPaid ? "View transaction" : "View order & pay"}</Link>
                </div>
                {orderPayments.length > 0 && <div className="mt-4 border-t border-emerald-900/10 pt-3">
                  <p className="text-xs font-bold text-forest">Payment activity</p>
                  <div className="mt-2 space-y-2">
                    {orderPayments.map((payment, index) => <div key={`${payment.order_id}-${payment.paid_at ?? index}-${payment.amount_minor}`} className="flex flex-wrap justify-between gap-2 text-xs text-slate-600">
                      <span className="capitalize">{payment.payment_kind} · {payment.status}{payment.paid_at ? ` · ${new Date(payment.paid_at).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}` : ""}</span>
                      <strong className="text-forest">{money(Number(payment.amount_minor), payment.currency)}</strong>
                    </div>)}
                  </div>
                </div>}
              </article>
            );
          })}
        </div>
        <p className="mt-7 text-xs leading-5 text-slate-500">Order records are retained in your account as transaction history. A successful return from Stripe checkout is not treated as proof of payment; only a verified payment confirmation changes the payment status.</p>
      </section>
    </main>
  );
}
