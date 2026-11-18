import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fulfillAllocation, addOrderComment, updateBuyerOrderDetails, updateOrderFulfilmentSchedule, confirmOrderDeliveryFee } from "@/actions/orders";
import { PackageCheck } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { createProductReview } from "@/actions/reviews";

type OrderComment = { id: string; author_id: string; author_display_name: string; author_role: string; body: string; created_at: string };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; updated?: string; accepted?: string; schedule_updated?: string; fee_confirmed?: string }>;
}) {
  const { id } = await params;
  const queryParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: order }, { data: profile }] = await Promise.all([
    supabase.from("orders").select("id,buyer_id,quantity_agreed,unit,unit_price,currency,status,created_at,listing_id,collection_method,collection_point,collection_window_start,collection_window_end,buyer_name,buyer_contact_number,fulfilment_preference,delivery_location,order_instructions,fulfilment_method,scheduled_start,scheduled_end,fulfilment_location,seller_instructions,delivery_fee,delivery_fee_accepted_at,fulfilment_state").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  if (!order) notFound();

  const { data: sellerDetails } = order.listing_id
    ? await supabase.from("listing_private_details").select("contact_phone,fulfilment_details").eq("listing_id",order.listing_id).maybeSingle()
    : { data: null };
  const reviewResult = profile?.role === "buyer"
    ? await supabase.from("product_reviews").select("id").eq("order_id",id).maybeSingle()
    : { data: null };
  const existingReview = reviewResult.data;
  const [{ data: allocations }, { data: events }, { data: comments }, { data: scheduleEvents }] = await Promise.all([
    supabase.from("order_allocations").select("id,listing_id,farmer_id,quantity_allocated,agreed_unit_price,status").eq("order_id", id),
    supabase.from("order_events").select("event_type,from_status,to_status,note,created_at").eq("order_id", id).order("created_at"),
    supabase.from("order_comments").select("id,author_id,author_display_name,author_role,body,created_at").eq("order_id",id).order("created_at"),\n    supabase.from("order_schedule_events").select("id,event_type,previous_schedule,new_schedule,note,created_at").eq("order_id",id).order("created_at",{ascending:false}),
    profile?.role === "buyer" ? supabase.from("product_reviews").select("id").eq("order_id",id).maybeSingle() : Promise.resolve({data:null}),
  ]);

  return (
    <main className="min-h-screen agri-page">
      <AppNav active="dashboard" />
      <div className="mx-auto max-w-3xl px-5 py-8 sm:py-10">
        <Link href="/dashboard" className="text-sm font-bold text-leaf">← Back to dashboard</Link>
        <div className="mt-5 rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-leaf">Order tracking</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold text-forest">Order {order.id.slice(0, 8)}</h1><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-leaf">{order.status}</span></div>
          <p className="mt-5 text-3xl font-bold text-forest">{Number(order.quantity_agreed).toLocaleString()} {order.unit}</p>
          <p className="mt-1 text-sm text-slate-600">Agreed unit price: R{Number(order.unit_price).toFixed(2)} / {order.unit}</p>
          <p className="mt-1 text-xs text-slate-400">Created {new Date(order.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</p>
          <div className="mt-5 rounded-xl bg-[#f7faf7] p-4 text-sm"><h2 className="font-bold text-forest">Buyer and fulfilment details</h2><p className="mt-2"><strong>Buyer:</strong> {order.buyer_name}</p><p className="mt-1"><strong>Contact:</strong> {order.buyer_contact_number}</p><p className="mt-1"><strong>Preference:</strong> {order.fulfilment_preference}</p>{order.fulfilment_preference==="delivery"&&<p className="mt-1"><strong>Delivery location:</strong> {order.delivery_location}</p>}{order.order_instructions&&<p className="mt-2"><strong>Instructions:</strong> {order.order_instructions}</p>}</div><div className="mt-3 rounded-xl border border-emerald-900/10 bg-[#f7faf7] p-4 text-sm"><h2 className="font-bold text-forest">Delivery / collection schedule</h2><p className="mt-2"><strong>Method:</strong> {order.fulfilment_method==="delivery"?"Delivery":"Collection"}</p><p className="mt-1"><strong>When:</strong> {order.scheduled_start ? new Date(order.scheduled_start).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"}) : "Not scheduled yet"}{order.scheduled_end ? " – "+new Date(order.scheduled_end).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"}) : ""}</p><p className="mt-1"><strong>Location:</strong> {order.fulfilment_location||"To be confirmed"}</p>{order.seller_instructions&&<p className="mt-2 whitespace-pre-wrap"><strong>Seller instructions:</strong> {order.seller_instructions}</p>}{Number(order.delivery_fee||0)>0&&<div className="mt-3 rounded-lg bg-amber-50 p-3"><p><strong>Delivery fee:</strong> R{Number(order.delivery_fee).toFixed(2)}</p>{profile?.role==="buyer"&&!order.delivery_fee_accepted_at&&<><p className="mt-1 text-xs text-amber-900">This extra charge requires your agreement. It is not accepted until you confirm below.</p><form action={confirmOrderDeliveryFee} className="mt-2"><input type="hidden" name="order_id" value={id}/><button className="rounded-lg bg-forest px-3 py-2 text-xs font-bold text-white">Agree to delivery fee</button></form></>}{order.delivery_fee_accepted_at&&<p className="mt-1 text-xs font-semibold text-emerald-700">Delivery fee accepted</p>}</div>}</div>{sellerDetails&&<div className="mt-3 rounded-xl bg-emerald-50 p-4 text-sm"><h2 className="font-bold text-forest">Farmer contact and fulfilment</h2><p className="mt-2"><strong>Contact:</strong> {sellerDetails.contact_phone}</p><p className="mt-1 whitespace-pre-wrap"><strong>Details:</strong> {sellerDetails.fulfilment_details}</p></div>}
          {queryParams.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">We could not update this order. Check the details and try again.</p>}{queryParams.updated&&<p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Order details updated. The farmer has been notified.</p>}{queryParams.accepted&&<p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Order accepted. The buyer has been notified of the fulfilment schedule.</p>}{queryParams.schedule_updated&&<p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">The updated schedule has been sent to the buyer.</p>}{queryParams.fee_confirmed&&<p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">You accepted the delivery fee.</p>}
          {profile?.role==="farmer"&&allocations?.some((a)=>a.farmer_id===user.id)&&order.status==="accepted"&&<form action={updateOrderFulfilmentSchedule} className="mt-5 rounded-xl border border-emerald-900/10 p-4"><h2 className="font-bold text-forest">Update delivery / collection schedule</h2><input type="hidden" name="order_id" value={id}/><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Fulfilment method<select name="fulfilment_method" defaultValue={order.fulfilment_method||"collection"} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3"><option value="delivery">Delivery</option><option value="collection">Collection</option></select></label><label className="text-sm font-semibold text-slate-700">Date and time<input name="scheduled_start" type="datetime-local" required defaultValue={order.scheduled_start?new Date(new Date(order.scheduled_start).getTime()-2*60*60*1000).toISOString().slice(0,16):""} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"/></label><label className="text-sm font-semibold text-slate-700">End time (optional)<input name="scheduled_end" type="datetime-local" defaultValue={order.scheduled_end?new Date(new Date(order.scheduled_end).getTime()-2*60*60*1000).toISOString().slice(0,16):""} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"/></label><label className="text-sm font-semibold text-slate-700">Location<input name="fulfilment_location" required minLength={3} maxLength={300} defaultValue={order.fulfilment_location||""} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"/></label><label className="text-sm font-semibold text-slate-700">Delivery fee (R)<input name="delivery_fee" type="number" min="0" step="0.01" defaultValue={Number(order.delivery_fee||0)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"/></label><label className="text-sm font-semibold text-slate-700 sm:col-span-2">Instructions<textarea name="seller_instructions" rows={2} maxLength={1000} defaultValue={order.seller_instructions||""} className="mt-1 w-full rounded-lg border border-slate-200 p-3"/></label></div><button className="mt-3 rounded-xl bg-forest px-4 py-2 text-sm font-bold text-white">Save new schedule</button></form>}{profile?.role==="buyer"&&["pending","accepted"].includes(order.status)&&<form action={updateBuyerOrderDetails} className="mt-5 rounded-xl border border-emerald-900/10 p-4"><h2 className="font-bold text-forest">Update order details</h2><input type="hidden" name="order_id" value={id}/><label className="mt-3 block text-sm font-semibold text-slate-700">Buyer name or business<input name="buyer_name" required minLength={2} maxLength={120} defaultValue={order.buyer_name} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3"/></label><label className="mt-3 block text-sm font-semibold text-slate-700">Contact number<input name="buyer_contact_number" type="tel" required minLength={7} maxLength={30} defaultValue={order.buyer_contact_number} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3"/></label><label className="mt-3 block text-sm font-semibold text-slate-700">Delivery or collection<select name="fulfilment_preference" defaultValue={order.fulfilment_preference} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"><option value="collection">Collection</option><option value="delivery">Delivery</option></select></label><label className="mt-3 block text-sm font-semibold text-slate-700">Delivery location (required for delivery)<input name="delivery_location" defaultValue={order.delivery_location||""} maxLength={300} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3"/></label><label className="mt-3 block text-sm font-semibold text-slate-700">Instructions<textarea name="order_instructions" defaultValue={order.order_instructions||""} maxLength={1000} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 p-3"/></label><button className="mt-3 rounded-xl bg-forest px-4 py-2 text-sm font-bold text-white">Save order updates</button></form>}
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

        <section id="conversation" className="mt-5 rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-forest">Order conversation</h2>
          <p className="mt-1 text-xs text-slate-500">Only this order&apos;s buyer and allocated farmer(s) can read or post messages.</p>
          {queryParams.error==="comment"&&<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">Your comment could not be sent. Please try again.</p>}
          {comments?.length ? <ol className="mt-4 space-y-3">{(comments as OrderComment[]).map((comment)=><li key={comment.id} className="rounded-xl bg-[#f7faf7] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-forest">{comment.author_display_name} <span className="font-normal capitalize text-slate-500">· {String(comment.author_role||"").replaceAll("_"," ")}</span></p><time className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"})}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.body}</p></li>)}</ol> : <p className="mt-4 text-sm text-slate-500">No messages yet. Confirm timing, packaging and fulfilment here.</p>}
          <form action={addOrderComment} className="mt-5"><input type="hidden" name="order_id" value={id}/><label className="block text-sm font-semibold text-slate-700">Add a comment<textarea name="body" required maxLength={2000} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Write a message about this order…"/></label><button className="mt-3 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-white">Send comment</button></form>
        </section>

        <section className="mt-5 rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-forest">Schedule history</h2>{scheduleEvents?.length?<ol className="mt-4 space-y-3">{scheduleEvents.map((event)=><li key={event.id} className="border-l-2 border-emerald-200 pl-4"><p className="text-sm font-semibold capitalize text-forest">{String(event.event_type).replaceAll("_"," ")}</p><p className="mt-1 text-xs text-slate-600">{event.new_schedule?.method||""} · {event.new_schedule?.start?new Date(event.new_schedule.start).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"}):""} · {event.new_schedule?.location||""}</p>{event.note&&<p className="mt-1 text-xs text-slate-500">{event.note}</p>}<time className="mt-1 block text-xs text-slate-400">{new Date(event.created_at).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"})}</time></li>)}</ol>:<p className="mt-3 text-sm text-slate-500">No schedule changes recorded.</p>}<h2 className="mt-6 font-bold text-forest">Order history</h2>
          {events?.length ? <ol className="mt-4 space-y-4">{events.map((event, index) => <li key={index} className="border-l-2 border-emerald-200 pl-4"><p className="text-sm font-semibold capitalize text-forest">{event.event_type.replaceAll("_", " ")}</p>{event.note && <p className="mt-1 text-sm text-slate-600">{event.note}</p>}<p className="mt-1 text-xs text-slate-500">{new Date(event.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</p></li>)}</ol> : <p className="mt-3 text-sm text-slate-500">No order events recorded yet.</p>}
        </section>
      </div>
    </main>
  );
}
