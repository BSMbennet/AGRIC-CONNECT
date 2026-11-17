import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: order } = await supabase.from("orders").select("id,buyer_id,quantity_agreed,unit,unit_price,currency,status,created_at,listing_id").eq("id", id).single();
  if (!order) notFound();
  const { data: allocations } = await supabase.from("order_allocations").select("listing_id,farmer_id,quantity_allocated,agreed_unit_price").eq("order_id", id);
  const { data: events } = await supabase.from("order_events").select("event_type,from_status,to_status,note,created_at").eq("order_id", id).order("created_at");
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/dashboard" className="text-sm font-bold text-forest">← Dashboard</Link>
      <div className="mt-6 rounded-3xl border border-emerald-900/10 bg-white p-7 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wide text-leaf">Order confirmation</p>
        <h1 className="mt-2 text-2xl font-bold text-forest">Order {order.id.slice(0, 8)}</h1>
        <span className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-leaf">{order.status}</span>
        <p className="mt-5 text-3xl font-bold text-forest">{Number(order.quantity_agreed).toLocaleString()} {order.unit}</p>
        <p className="mt-1 text-sm text-slate-600">Agreed unit price: R{Number(order.unit_price).toFixed(2)}</p>
        <p className="mt-4 text-xs text-slate-500">This application does not collect or hold payments. Confirm collection and payment directly with the other party.</p>
      </div>
      <section className="mt-6 rounded-2xl border border-emerald-900/10 bg-white p-6"><h2 className="font-bold text-forest">Supply allocations</h2><div className="mt-3 space-y-2">{allocations?.map((allocation) => <div key={allocation.listing_id} className="flex justify-between text-sm"><span className="text-slate-600">Farmer allocation</span><span className="font-semibold text-forest">{Number(allocation.quantity_allocated)} {order.unit} · R{Number(allocation.agreed_unit_price).toFixed(2)}</span></div>)}</div></section>
      <section className="mt-6 rounded-2xl border border-emerald-900/10 bg-white p-6"><h2 className="font-bold text-forest">Order history</h2><ol className="mt-4 space-y-4">{events?.map((event, index) => <li key={index} className="border-l-2 border-emerald-200 pl-4"><p className="text-sm font-semibold capitalize text-forest">{event.event_type.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-slate-500">{new Date(event.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</p></li>)}</ol></section>
    </main>
  );
}
