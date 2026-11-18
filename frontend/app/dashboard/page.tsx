import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptRequest, rejectRequest, fulfillAllocation, confirmPreorderRequest } from "@/actions/orders";
import { updateListingStatus } from "@/actions/listings";
import { markNotificationRead } from "@/actions/notifications";
import { Sprout, ShoppingBasket, PlusCircle, Layers3, ShieldCheck, PackageCheck, ClipboardList } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { ClearCartOnSuccess } from "@/components/clear-cart-on-success";

type BuyerRequest = {
  id: string;
  buyer_id: string;
  quantity_requested: number;
  proposed_price: number | null;
  message: string | null;
  buyer_name?: string;
  contact_number?: string;
  fulfilment_preference?: string;
  delivery_location?: string | null;
  order_instructions?: string | null;
  created_at: string;
  status: string;
  request_type?: string;
  requested_harvest_date?: string | null;
};

type ListingWithRequests = {
  produce_name: string;
  buyer_requests: BuyerRequest[] | null;
};

type FarmerAllocation = {
  id: string;
  order_id: string;
  quantity_allocated: number;
  agreed_unit_price: number;
  status: string;
  orders: { id: string; status: string; created_at: string; unit: string; unit_price: number; fulfilment_method?: string; scheduled_start?: string | null; scheduled_end?: string | null; fulfilment_location?: string | null; seller_instructions?: string | null; delivery_fee?: number } | null;
  produce_listings: { produce_name: string } | null;
};

type BuyerOrder = {
  id: string;
  quantity_agreed: number;
  unit: string;
  unit_price: number;
  status: string;
  created_at: string;
  fulfilment_method?: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  fulfilment_location?: string | null;
  delivery_fee?: number;
};

type BuyerRequestWithListing = BuyerRequest & {
  produce_listings: { produce_name: string; locality: string } | null;
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string; requested?: string; rejected?: string; listing_updated?: string; preorder_confirmed?: string; cart_requested?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("display_name, role, locality, cooperative_id").eq("id", user.id).single();
  if (!profile) redirect("/register?error=profile");

  const isFarmer = profile.role === "farmer";
  const { data: notifications } = await supabase.from("notifications").select("id,order_id,title,body,notification_type,read_at,created_at").eq("recipient_id",user.id).order("created_at",{ascending:false}).limit(10);
  const { count: listingCount } = await supabase.from("produce_listings").select("*", { count: "exact", head: true }).eq("farmer_id", user.id).eq("status","active");
  const { data: farmerPlan } = isFarmer ? await supabase.from("farmer_subscriptions").select("plan,status,current_period_end").eq("farmer_id",user.id).in("status",["active","trialing"]).gt("current_period_end",new Date().toISOString()).order("current_period_end",{ascending:false}).limit(1).maybeSingle() : {data:null};
  const listingLimit = farmerPlan?.plan === "premium" ? 200 : farmerPlan?.plan === "pro" ? 50 : 10;
  const { data: listings } = isFarmer ? await supabase.from("produce_listings")
    .select("id,produce_name,buyer_requests!inner(id,buyer_id,quantity_requested,proposed_price,message,buyer_name,contact_number,fulfilment_preference,delivery_location,order_instructions,created_at,status,request_type,requested_harvest_date)")
    .eq("farmer_id", user.id).eq("buyer_requests.status", "pending").order("created_at", { ascending: false, foreignTable: "buyer_requests" }) : { data: [] };
  const pendingRequests = (listings ?? []).flatMap((listing: ListingWithRequests) => (listing.buyer_requests ?? []).map((request: BuyerRequest) => ({ ...request, produce_name: listing.produce_name })));
  const { data: confirmedPreorderListings } = isFarmer ? await supabase.from("produce_listings")
    .select("id,produce_name,buyer_requests!inner(id,buyer_id,quantity_requested,proposed_price,message,buyer_name,contact_number,fulfilment_preference,delivery_location,order_instructions,created_at,status,request_type,requested_harvest_date)")
    .eq("farmer_id", user.id).eq("buyer_requests.status", "accepted").eq("buyer_requests.request_type", "preorder")
    .order("created_at", { ascending: false, foreignTable: "buyer_requests" }) : { data: [] };
  const confirmedPreorders = (confirmedPreorderListings ?? []).flatMap((listing: ListingWithRequests) => (listing.buyer_requests ?? []).map((request: BuyerRequest) => ({ ...request, produce_name: listing.produce_name })));
  const { count: buyerRequestCount } = isFarmer ? { count: pendingRequests.length } : await supabase.from("buyer_requests").select("id", { count: "exact", head: true }).eq("buyer_id", user.id);
  const { data: assignedFarmers } = profile.role === "agent" ? await supabase.from("profiles").select("id,display_name,locality").eq("created_by_agent_id", user.id).order("created_at", { ascending: false }) : { data: [] };

  const { data: myListings } = isFarmer ? await supabase.from("produce_listings")
    .select("id,produce_name,status,quantity_available,reserved_quantity,quantity_sold,unit,asking_price,image_urls")
    .eq("farmer_id", user.id).order("created_at", { ascending: false }).limit(12) : { data: [] };

  const { data: buyerOrderRows } = profile.role === "buyer" ? await supabase.from("orders")
    .select("id,quantity_agreed,unit,unit_price,status,created_at,fulfilment_method,scheduled_start,scheduled_end,fulfilment_location,delivery_fee")
    .eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(10) : { data: [] };
  const buyerOrders = (buyerOrderRows ?? []) as BuyerOrder[];

  const { data: buyerRequestRows } = profile.role === "buyer" ? await supabase.from("buyer_requests")
    .select("id,buyer_id,quantity_requested,proposed_price,message,created_at,status,request_type,requested_harvest_date,produce_listings!inner(produce_name,locality)")
    .eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(10) : { data: [] };
  const buyerRequests = (buyerRequestRows ?? []) as unknown as BuyerRequestWithListing[];

  const { data: farmerAllocationRows } = isFarmer ? await supabase.from("order_allocations")
    .select("id,order_id,quantity_allocated,agreed_unit_price,status,orders!inner(id,status,created_at,unit,unit_price,fulfilment_method,scheduled_start,scheduled_end,fulfilment_location,seller_instructions,delivery_fee),produce_listings!inner(produce_name)")
    .eq("farmer_id", user.id).order("created_at", { ascending: false, foreignTable: "orders" }).limit(10) : { data: [] };
  const farmerAllocations = (farmerAllocationRows ?? []) as unknown as FarmerAllocation[];

  return (
    <main className="min-h-screen agri-page">
      <AppNav active="dashboard" />
      {params.cart_requested && <ClearCartOnSuccess />}
      <section className="mx-auto max-w-6xl px-5 py-10">
        <p className="text-sm font-semibold capitalize text-leaf">Your workspace · {profile.role.replaceAll("_", " ")}</p>
        <h1 className="mt-2 text-3xl font-bold text-forest">Hello, {profile.display_name}</h1>
        <p className="mt-2 text-slate-600">{profile.locality || "Vhembe"}, Limpopo</p>
        {params.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.error === "insufficient_stock" ? "Not enough stock remains to accept that request." : params.error === "fulfill" ? "This supply allocation could not be marked as fulfilled." : params.error === "preorder" ? "The pre-order could not be confirmed." : params.error === "schedule" ? "Please provide a valid future delivery or collection date, time and location." : params.error === "rejection" ? "Please provide a rejection reason of at least 3 characters." : "The requested action could not be completed."}</p>}
        {params.requested && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Your buyer request has been sent.</p>}
        {params.preorder_confirmed && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Pre-order confirmed. No stock has been reserved; agree the harvest and collection details with the buyer.</p>}
        {params.rejected && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">The buyer request was rejected.</p>}
        {params.listing_updated && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Your listing visibility has been updated.</p>}
        <section className="mt-8 rounded-2xl border border-emerald-900/10 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-forest">Notifications</h2>
            <span className="text-xs text-slate-500">
              {(notifications ?? []).filter((notification) => !notification.read_at).length} unread
            </span>
          </div>
          {notifications?.length ? (
            <ul className="mt-3 divide-y divide-slate-100">
              {notifications.map((notification) => (
                <li key={notification.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-forest">{notification.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(notification.created_at).toLocaleString("en-ZA", {
                          timeZone: "Africa/Johannesburg",
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {notification.order_id && (
                        <Link
                          href={"/orders/" + notification.order_id}
                          className="text-xs font-bold text-leaf"
                        >
                          Open order →
                        </Link>
                      )}
                      {!notification.read_at && (
                        <form action={markNotificationRead}>
                          <input
                            type="hidden"
                            name="notification_id"
                            value={notification.id}
                          />
                          <button className="text-xs text-slate-500 underline">
                            Mark read
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              New order requests and comments will appear here.
            </p>
          )}
        </section>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {isFarmer ? <div className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm"><Sprout className="text-leaf" /><p className="mt-4 text-3xl font-bold text-forest">{listingCount ?? 0}</p><p className="text-sm text-slate-600">Active produce listings · {listingCount ?? 0} / {listingLimit}</p><p className="mt-1 text-xs capitalize text-slate-500">{farmerPlan?.plan ?? "Free"} plan</p>{(listingCount ?? 0) >= listingLimit && <Link href="/subscriptions" className="mt-3 inline-block text-xs font-bold text-leaf">Upgrade to list more →</Link>}<Link href="/listings/new" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-leaf"><PlusCircle size={17}/> Add produce</Link></div> : <div className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm"><ShoppingBasket className="text-leaf"/><p className="mt-4 text-3xl font-bold text-forest">Marketplace</p><p className="text-sm text-slate-600">Discover produce available nearby.</p><Link href="/marketplace" className="mt-5 inline-block text-sm font-bold text-leaf">Browse listings →</Link></div>}
          <div className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm"><p className="text-3xl font-bold text-forest">{buyerRequestCount ?? 0}</p><p className="text-sm text-slate-600">{isFarmer ? "Pending buyer requests" : "Your buyer requests"}</p></div>
        </div>

        {isFarmer && <section className="mt-10"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-forest">Your produce listings</h2><Link href="/listings/new" className="text-sm font-bold text-leaf">+ Add produce</Link></div>{myListings?.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{myListings.map((item) => { const available = Number(item.quantity_available) - Number(item.reserved_quantity) - Number(item.quantity_sold); return <article key={item.id} className="rounded-2xl border border-emerald-900/10 bg-white p-5"><div className="flex items-center justify-between gap-2"><h3 className="font-bold text-forest">{item.produce_name}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold capitalize text-slate-600">{item.status}</span></div><p className="mt-2 text-sm text-slate-600">{available.toLocaleString()} {item.unit} available</p><p className="mt-1 text-sm font-semibold text-forest">R{Number(item.asking_price).toFixed(2)} / unit</p><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-3"><Link href={`/marketplace/${item.id}`} className="text-xs font-bold text-leaf">View listing →</Link><Link href={`/listings/${item.id}/photos`} className="text-xs font-bold text-leaf">{item.image_urls?.length ? "Manage photos" : "Add photos"}</Link></div>{(item.status === "active" || item.status === "paused") && <form action={updateListingStatus}><input type="hidden" name="listing_id" value={item.id}/><input type="hidden" name="status" value={item.status === "active" ? "paused" : "active"}/><button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">{item.status === "active" ? "Pause listing" : "Reactivate"}</button></form>}</div></article>; })}</div> : <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-slate-600">You have not published produce yet. <Link href="/listings/new" className="font-bold text-leaf">Add your first listing</Link>.</p>}</section>}

        {profile.role === "agent" && <section className="mt-10"><h2 className="text-xl font-bold text-forest">Farmers you assist</h2>{assignedFarmers?.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{assignedFarmers.map((farmer) => <article key={farmer.id} className="rounded-2xl border border-emerald-900/10 bg-white p-5"><p className="font-bold text-forest">{farmer.display_name}</p><p className="mt-1 text-xs text-slate-500">{farmer.locality || "Vhembe"}</p><Link href={`/agent/farmers/${farmer.id}/listing`} className="mt-4 inline-flex rounded-lg bg-forest px-3 py-2 text-xs font-bold text-white">Add farmer produce</Link></article>)}</div> : <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-slate-600">You have not registered any farmers yet. <Link href="/agent/register-farmer" className="font-bold text-leaf">Register a farmer</Link>.</p>}</section>}

        {isFarmer && confirmedPreorders.length > 0 && <section className="mt-8"><h2 className="text-xl font-bold text-forest">Confirmed pre-orders</h2><div className="mt-4 space-y-3">{confirmedPreorders.map((request: BuyerRequest & {produce_name:string})=><article key={request.id} className="rounded-2xl border border-emerald-900/10 bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold text-forest">{request.produce_name}</h3><p className="mt-1 text-sm text-slate-600">{request.quantity_requested} requested · expected harvest {request.requested_harvest_date||"date not set"}</p><p className="mt-2 text-xs text-slate-700"><strong>Buyer:</strong> {request.buyer_name} · {request.contact_number}</p></div><span className="text-xs font-semibold text-emerald-700">Confirmed</span></div><p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">No stock is reserved for this pre-order. Contact the buyer to confirm the harvest plan, then publish available stock when it is ready.</p></article>)}</div></section>}

        {isFarmer && <section id="buyer-requests" className="mt-10"><h2 className="text-xl font-bold text-forest">Buyer requests</h2>{pendingRequests.length ? <div className="mt-4 space-y-3">{pendingRequests.map((request: BuyerRequest & { produce_name: string }) => <article key={request.id} className="rounded-2xl border border-emerald-900/10 bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold text-forest">{request.produce_name}</h3><p className="mt-1 text-sm text-slate-600">{request.quantity_requested} requested{request.proposed_price !== null ? ` · proposed R${Number(request.proposed_price).toFixed(2)}` : ""}</p>{request.request_type==="preorder"&&<p className="mt-1 text-xs font-semibold text-amber-700">Pre-order · expected harvest {request.requested_harvest_date||"date not set"} · confirmation does not reserve stock</p>}<div className="mt-3 grid gap-1 rounded-xl bg-[#f7faf7] p-3 text-xs text-slate-700"><p><strong>Buyer:</strong> {request.buyer_name} · {request.contact_number}</p><p><strong>Fulfilment:</strong> {request.fulfilment_preference}{request.delivery_location ? " · "+request.delivery_location : ""}</p>{request.order_instructions&&<p><strong>Instructions:</strong> {request.order_instructions}</p>}{request.message&&<p><strong>Message:</strong> {request.message}</p>}</div></div><span className="text-xs font-semibold text-amber-700">Pending</span></div>{request.request_type==="preorder" ? <div className="mt-4"><form action={confirmPreorderRequest} className="rounded-xl border border-emerald-900/10 bg-[#f7faf7] p-4"><p className="text-sm font-bold text-forest">Confirm pre-order (no stock reserved)</p><p className="mt-1 text-xs text-slate-600">Confirm that you can plan for this requested harvest. No current stock will be reserved.</p><input type="hidden" name="request_id" value={request.id}/><button className="mt-3 rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white">Confirm pre-order</button></form></div> : <div className="mt-4 grid gap-3"><form action={acceptRequest} className="rounded-xl border border-emerald-900/10 bg-[#f7faf7] p-4"><input type="hidden" name="request_id" value={request.id}/><h4 className="text-sm font-bold text-forest">Accept and schedule fulfilment</h4><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Fulfilment method<select name="fulfilment_method" defaultValue={request.fulfilment_preference||"collection"} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="delivery">Deliver to buyer</option><option value="collection">Buyer collects</option></select></label><label className="text-xs font-semibold text-slate-700">Date and time<input name="scheduled_start" type="datetime-local" required className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-700">End time (optional)<input name="scheduled_end" type="datetime-local" className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-700">Delivery / collection location<input name="fulfilment_location" required minLength={3} maxLength={300} defaultValue={request.delivery_location||""} placeholder="Enter farm, collection point or delivery address" className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-700">Delivery fee (R; 0 if free)<input name="delivery_fee" type="number" min="0" step="0.01" defaultValue="0" className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-700 sm:col-span-2">Instructions for buyer<textarea name="seller_instructions" maxLength={1000} rows={2} placeholder="What should the buyer know?" className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm"/></label></div><p className="mt-2 text-xs text-slate-500">The buyer will receive this schedule. Any delivery fee must be accepted by the buyer before it is agreed.</p><button className="mt-3 rounded-xl bg-forest px-4 py-2.5 text-xs font-bold text-white">Accept order and send schedule</button></form><form action={rejectRequest} className="rounded-xl border border-red-100 p-4"><input type="hidden" name="request_id" value={request.id}/><label className="block text-xs font-semibold text-slate-700">Reason for rejecting<textarea name="rejection_reason" required minLength={3} maxLength={500} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm" placeholder="Briefly explain why you cannot fulfil this request"/></label><button className="mt-2 rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-700">Reject request</button></form></div>}</article>)}</div> : <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-slate-600">No pending requests yet. Your listings will appear in the marketplace for buyers to discover.</p>}</section>}

        {profile.role === "buyer" && <section className="mt-10"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-forest">Your buyer requests</h2><Link href="/marketplace" className="text-sm font-bold text-leaf">Find more produce</Link></div>{buyerRequests.length ? <div className="mt-4 space-y-3">{buyerRequests.map((request) => <article key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-900/10 bg-white p-5"><div><h3 className="font-bold text-forest">{request.produce_listings?.produce_name ?? "Produce listing"}</h3><p className="mt-1 text-xs text-slate-500">{request.produce_listings?.locality ?? "Vhembe"} · {request.quantity_requested} requested{request.proposed_price !== null ? ` · offered R${Number(request.proposed_price).toFixed(2)}` : ""}</p>{request.request_type==="preorder"&&<p className="mt-1 text-xs font-semibold text-amber-700">Pre-order · expected harvest {request.requested_harvest_date||"date not set"}</p>}<p className="mt-1 text-xs text-slate-400">{new Date(request.created_at).toLocaleDateString("en-ZA")}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700">{request.status}</span></article>)}</div> : <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-slate-600">You have not requested any produce yet. Browse the marketplace to contact local farmers.</p>}</section>}

        {profile.role === "buyer" && <section className="mt-10"><h2 className="flex items-center gap-2 text-xl font-bold text-forest"><ClipboardList size={20}/> Your orders</h2>{buyerOrders.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{buyerOrders.map((order) => <article key={order.id} className="rounded-2xl border border-emerald-900/10 bg-white p-5"><div className="flex items-center justify-between gap-2"><p className="font-bold text-forest">Order {order.id.slice(0, 8)}</p><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-leaf">{order.status}</span></div><p className="mt-2 text-sm text-slate-600">{Number(order.quantity_agreed).toLocaleString()} {order.unit} · R{Number(order.unit_price).toFixed(2)} per {order.unit}</p><Link href={`/orders/${order.id}`} className="mt-4 inline-block text-sm font-bold text-leaf">Track order →</Link></article>)}</div> : <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-slate-600">Accepted requests will appear here as orders. No orders yet.</p>}</section>}

        {isFarmer && farmerAllocations.length > 0 && <section className="mt-10"><h2 className="flex items-center gap-2 text-xl font-bold text-forest"><PackageCheck size={20}/> Orders to fulfil</h2><div className="mt-4 space-y-3">{farmerAllocations.map((allocation) => <article key={allocation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-900/10 bg-white p-5"><div><p className="font-bold text-forest">{allocation.produce_listings?.produce_name ?? "Produce allocation"}</p><p className="mt-1 text-sm text-slate-600">{allocation.quantity_allocated} {allocation.orders?.unit ?? ""} · R{Number(allocation.agreed_unit_price).toFixed(2)} per unit</p><p className="mt-1 text-xs capitalize text-slate-500">Order {allocation.order_id.slice(0, 8)} · {allocation.orders?.status ?? "unknown"} · allocation {allocation.status}</p>{allocation.orders?.scheduled_start && <p className="mt-2 text-xs text-slate-600">{allocation.orders.fulfilment_method==="delivery"?"Delivery":"Collection"} · {new Date(allocation.orders.scheduled_start).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"})} · {allocation.orders.fulfilment_location}</p>}</div><div className="flex flex-wrap gap-2"><Link href={`/orders/${allocation.order_id}`} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-forest">View order</Link>{allocation.status !== "fulfilled" && allocation.orders?.status === "accepted" && <form action={fulfillAllocation}><input type="hidden" name="allocation_id" value={allocation.id}/><button className="rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white">Mark fulfilled</button></form>}</div></article>)}</div></section>}

        {(profile.role === "buyer" || profile.role === "cooperative_manager") && <Link href="/coop/aggregate" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white px-5 py-3 text-sm font-bold text-forest"><Layers3 size={17}/> Combine supply from farmers</Link>}
        {profile.role === "admin" && <Link href="/admin" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white px-5 py-3 text-sm font-bold text-forest"><ShieldCheck size={17}/> Open admin console</Link>}
        <div className="mt-10 border-t border-emerald-900/10 pt-5"><Link href="/privacy" className="text-xs text-slate-500 underline">Privacy notice</Link></div>
      </section>
    </main>
  );
}
