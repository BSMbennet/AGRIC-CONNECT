import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fulfillAllocation } from "@/actions/orders";
import { PackageCheck, Sprout } from "lucide-react";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const queryParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: order }, { data: profile }] = await Promise.all([
    supabase.from("orders").select("id,buyer_id,quantity_agreed,unit,unit_price,currency,status,created_at,listing_id,collection_method,collection_point,collection_window_start,collection_window_end").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  if (!order) notFound();

  const [{ data: allocations }, { data: events }] = await Promise.all([
    supabase.from("order_allocations").select("id,listing_id,farmer_id,quantity_allocated,agreed_unit_price,status").eq("order_id", id),
    supabase.from("order_events").select("event_type,from_status,to_status,note,created_at").eq("order_id", id).order("created_at"),
  ]);

  return (
    <main className="min-h-screen bg-[#f7faf7]">
      <header className="border-b border-emerald-900/10 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4"><Link href="/" className="flex items-center gap-2 font-bold text-forest"><Sprout size={21}/> AgricNorthX</Link><nav className="flex gap-4 text-sm font-semibold"><Link href="/marketplace" className="text-forest hover:text-leaf">Marketplace</Link><Link href="/dashboard" className="text-forest hover:text-leaf">Dashboard</Link></nav></div></header>
      <div className="mx-auto max-w-3xl px-5 py-8 sm:py-10">
        <Link href="/dashboard" className="text-sm font-bold text-leaf">← Back to dashboard</Link>
        <div className="mt-5 rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-leaf">Order tracking</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold text-forest">Order {order.id.slice(0, 8)}</h1><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-leaf">{order.status}</span></div>
          <p className="mt-5 text-3xl font-bold text-forest">{Number(order.quantity_agreed).toLocaleString()} {order.unit}</p>
          <p className="mt-1 text-sm text-slate-600">Agreed unit price: R{Number(order.unit_price).toFixed(2)} / {order.unit}</p>
          <p className="mt-1 text-xs text-slate-400">Created {new Date(order.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</p>
          {order.collection_point && <div className="mt-5 rounded-xl bg-[#f7faf7] p-4 text-sm"><p className="font-semibold text-forest">Collection point</p><p className="mt-1 text-slate-600">{order.collection_point}</p>{order.collection_method && <p className="mt-1 text-xs text-slate-500">{order.collection_method}</p>}</div>}
          {queryParams.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">We could not update this order. Refresh and try again.</p>}
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">AgricNorthX does not collect or hold payments. Buyer and farmer should agree payment and collection details directly, and only exchange payment after verifying the produce.</p>
        </div>

        <section className="mt-5 rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold text-forest"><PackageCheck size={19}/> Supply allocations</h2>
          <div className="mt-4 space-y-3">
            {allocations?.map((allocation) => <div key={allocation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f7faf7] p-4">
              <div><p className="font-semibold text-forest">Farmer supply</p><p className="mt-1 text-sm text-slate-600">{Number(allocation.quantity_allocated).toLocaleString()} {order.unit} · R{Number(allocation.agreed_unit_price).toFixed(2)} / unit</p><p className="mt-1 text-xs capitalize text-slate-500">Allocation: {allocation.status}</p></div>
              {profile?.role === "farmer" && allocation.farmer_id === user.id && allocation.status !== "fulfilled" && order.status === "accepted" && <form action={fulfillAllocation}><input type="hidden" name="allocation_id" value={allocation.id}/><button className="rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white">Confirm fulfilled</button></form>}
              {allocation.status === "fulfilled" && <span className="text-xs font-bold text-emerald-700">Fulfilled</span>}
            </div>)}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-forest">Order history</h2>
          {events?.length ? <ol className="mt-4 space-y-4">{events.map((event, index) => <li key={index} className="border-l-2 border-emerald-200 pl-4"><p className="text-sm font-semibold capitalize text-forest">{event.event_type.replaceAll("_", " ")}</p>{event.note && <p className="mt-1 text-sm text-slate-600">{event.note}</p>}<p className="mt-1 text-xs text-slate-500">{new Date(event.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</p></li>)}</ol> : <p className="mt-3 text-sm text-slate-500">No order events recorded yet.</p>}
        </section>
      </div>
    </main>
  );
}
