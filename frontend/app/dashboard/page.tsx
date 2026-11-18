import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { ClearCartOnSuccess } from "@/components/clear-cart-on-success";
import { acceptRequest, rejectRequest, fulfillAllocation, confirmPreorderRequest } from "@/actions/orders";
import { updateListingStatus } from "@/actions/listings";
import { markNotificationRead } from "@/actions/notifications";

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
  rejection_reason?: string | null;
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
  orders: { id: string; status: string; created_at: string; unit: string; unit_price: number; fulfilment_method?: string; scheduled_start?: string | null; scheduled_end?: string | null; fulfilment_location?: string | null; seller_instructions?: string | null; delivery_fee?: number; fulfilment_state?: string } | null;
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
  fulfilment_state?: string;
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
    .select("id,quantity_agreed,unit,unit_price,status,created_at,fulfilment_method,scheduled_start,scheduled_end,fulfilment_location,delivery_fee,fulfilment_state")
    .eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(10) : { data: [] };
  const buyerOrders = (buyerOrderRows ?? []) as BuyerOrder[];

  const { data: buyerRequestRows } = profile.role === "buyer" ? await supabase.from("buyer_requests")
    .select("id,buyer_id,quantity_requested,proposed_price,message,created_at,status,request_type,requested_harvest_date,rejection_reason,produce_listings!inner(produce_name,locality)")
    .eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(10) : { data: [] };
  const buyerRequests = ((buyerRequestRows ?? []) as unknown as BuyerRequestWithListing[]).filter((request) => request.status !== "accepted" || request.request_type === "preorder");

  const { data: farmerAllocationRows } = isFarmer ? await supabase.from("order_allocations")
    .select("id,order_id,quantity_allocated,agreed_unit_price,status,orders!inner(id,status,created_at,unit,unit_price,fulfilment_method,scheduled_start,scheduled_end,fulfilment_location,seller_instructions,delivery_fee,fulfilment_state),produce_listings!inner(produce_name)")
    .eq("farmer_id", user.id).order("created_at", { ascending: false, foreignTable: "orders" }).limit(10) : { data: [] };
  const farmerAllocations = (farmerAllocationRows ?? []) as unknown as FarmerAllocation[];

  return (
    <main className="min-h-screen agri-page scene-fields">
      <AppNav active="dashboard" />
      {params.cart_requested && <ClearCartOnSuccess />}
      <section className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-leaf">{profile.role.replaceAll("_", " ")} workspace</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-forest">Welcome back, {profile.display_name}</h1>
            <p className="mt-1 text-sm text-slate-500">{profile.locality || "Vhembe"}, Limpopo</p>
          </div>
          <Link href={isFarmer ? "/listings/new" : profile.role === "buyer" ? "/marketplace" : profile.role === "agent" ? "/agent/register-farmer" : "/admin"} className="inline-flex items-center rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-leaf">
            {isFarmer ? "Add produce" : profile.role === "buyer" ? "Find produce" : profile.role === "agent" ? "Register farmer" : "Admin console"}
          </Link>
        </div>

        {params.error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{params.error === "insufficient_stock" ? "Not enough stock remains to accept that request." : params.error === "fulfill" ? "This supply allocation could not be marked as fulfilled." : params.error === "preorder" ? "The pre-order could not be confirmed." : params.error === "schedule" ? "Please provide a valid future delivery or collection date, time and location." : params.error === "rejection" ? "Please provide a rejection reason of at least 3 characters." : "The requested action could not be completed."}</p>}
        {params.requested && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Your buyer request has been sent.</p>}
        {params.preorder_confirmed && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Pre-order confirmed. No stock has been reserved.</p>}
        {params.rejected && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">The buyer request was rejected.</p>}
        {params.listing_updated && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Your listing visibility has been updated.</p>}

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isFarmer ? <>
            <article className="rounded-2xl border border-emerald-900/10 bg-white p-5">
              <p className="text-sm text-slate-500">Active listings</p>
              <p className="mt-2 text-3xl font-bold text-forest">{listingCount ?? 0}<span className="ml-1 text-sm font-medium text-slate-400">/ {listingLimit}</span></p>
              <p className="mt-1 text-xs capitalize text-slate-500">{farmerPlan?.plan ?? "Free"} plan</p>
            </article>
            <article className="rounded-2xl border border-emerald-900/10 bg-white p-5">
              <p className="text-sm text-slate-500">Requests to review</p>
              <p className="mt-2 text-3xl font-bold text-forest">{pendingRequests.length}</p>
              <p className="mt-1 text-xs text-slate-500">{confirmedPreorders.length} confirmed pre-orders</p>
            </article>
            <article className="rounded-2xl border border-emerald-900/10 bg-white p-5">
              <p className="text-sm text-slate-500">Orders to fulfil</p>
              <p className="mt-2 text-3xl font-bold text-forest">{farmerAllocations.length}</p>
              <p className="mt-1 text-xs text-slate-500">Your current allocations</p>
            </article>
          </> : profile.role === "buyer" ? <>
            <article className="rounded-2xl border border-emerald-900/10 bg-white p-5"><p className="text-sm text-slate-500">Buyer requests</p><p className="mt-2 text-3xl font-bold text-forest">{buyerRequestCount ?? 0}</p></article>
            <article className="rounded-2xl border border-emerald-900/10 bg-white p-5"><p className="text-sm text-slate-500">Orders</p><p className="mt-2 text-3xl font-bold text-forest">{buyerOrders.length}</p></article>
            <article className="rounded-2xl border border-emerald-900/10 bg-white p-5"><p className="text-sm text-slate-500">Notifications</p><p className="mt-2 text-3xl font-bold text-forest">{(notifications ?? []).filter((n) => !n.read_at).length}</p><p className="mt-1 text-xs text-slate-500">Unread updates</p></article>
          </> : profile.role === "agent" ? <>
            <article className="rounded-2xl border border-emerald-900/10 bg-white p-5"><p className="text-sm text-slate-500">Farmers you assist</p><p className="mt-2 text-3xl font-bold text-forest">{assignedFarmers?.length ?? 0}</p></article>
            <article className="rounded-2xl border border-emerald-900/10 bg-white p-5"><p className="text-sm text-slate-500">Notifications</p><p className="mt-2 text-3xl font-bold text-forest">{(notifications ?? []).filter((n) => !n.read_at).length}</p><p className="mt-1 text-xs text-slate-500">Unread updates</p></article>
          </> : <>
            <article className="rounded-2xl border border-emerald-900/10 bg-white p-5"><p className="text-sm text-slate-500">Platform</p><p className="mt-2 text-xl font-bold text-forest">Admin workspace</p></article>
            <article className="rounded-2xl border border-emerald-900/10 bg-white p-5"><p className="text-sm text-slate-500">Notifications</p><p className="mt-2 text-3xl font-bold text-forest">{(notifications ?? []).filter((n) => !n.read_at).length}</p><p className="mt-1 text-xs text-slate-500">Unread updates</p></article>
          </>}
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-forest">Quick actions</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {isFarmer ? <>
              <Link href="/listings/new" className="rounded-xl border border-emerald-900/10 bg-white px-4 py-4 text-sm font-semibold text-forest hover:border-leaf">＋ Add produce <span className="mt-1 block text-xs font-normal text-slate-500">Publish a new harvest listing</span></Link>
              <Link href="/wallet" className="rounded-xl border border-emerald-900/10 bg-white px-4 py-4 text-sm font-semibold text-forest hover:border-leaf">Wallet <span className="mt-1 block text-xs font-normal text-slate-500">View sales and payment ledger</span></Link>
              <Link href="/subscriptions" className="rounded-xl border border-emerald-900/10 bg-white px-4 py-4 text-sm font-semibold text-forest hover:border-leaf">My plan <span className="mt-1 block text-xs font-normal text-slate-500">Manage listing limits</span></Link>
            </> : profile.role === "buyer" ? <>
              <Link href="/marketplace" className="rounded-xl border border-emerald-900/10 bg-white px-4 py-4 text-sm font-semibold text-forest hover:border-leaf">Browse marketplace <span className="mt-1 block text-xs font-normal text-slate-500">Find local produce</span></Link>
              <Link href="/orders" className="rounded-xl border border-emerald-900/10 bg-white px-4 py-4 text-sm font-semibold text-forest hover:border-leaf">My orders <span className="mt-1 block text-xs font-normal text-slate-500">Track fulfilment and payments</span></Link>
              <Link href="/coop/aggregate" className="rounded-xl border border-emerald-900/10 bg-white px-4 py-4 text-sm font-semibold text-forest hover:border-leaf">Combine supply <span className="mt-1 block text-xs font-normal text-slate-500">Coordinate cooperative orders</span></Link>
            </> : profile.role === "agent" ? <>
              <Link href="/agent/register-farmer" className="rounded-xl border border-emerald-900/10 bg-white px-4 py-4 text-sm font-semibold text-forest hover:border-leaf">Register a farmer <span className="mt-1 block text-xs font-normal text-slate-500">Add a farmer to your network</span></Link>
              <Link href="/marketplace" className="rounded-xl border border-emerald-900/10 bg-white px-4 py-4 text-sm font-semibold text-forest hover:border-leaf">Marketplace <span className="mt-1 block text-xs font-normal text-slate-500">View active produce</span></Link>
            </> : <Link href="/admin" className="rounded-xl border border-emerald-900/10 bg-white px-4 py-4 text-sm font-semibold text-forest hover:border-leaf">Open admin console <span className="mt-1 block text-xs font-normal text-slate-500">Manage platform operations</span></Link>}
          </div>
        </section>

        <section id="notifications" className="mt-8 rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <div><h2 className="font-bold text-forest">Recent notifications</h2><p className="mt-1 text-xs text-slate-500">{(notifications ?? []).filter((n) => !n.read_at).length} unread</p></div>
            <Link href="#notifications" className="text-xs font-semibold text-leaf">View updates</Link>
          </div>
          {notifications?.length ? <ul className="divide-y divide-slate-100 px-5">{notifications.slice(0, 3).map((notification) => <li key={notification.id} className="flex items-start justify-between gap-3 py-3"><div className="min-w-0"><p className="text-sm font-medium text-forest">{notification.title}</p><p className="mt-1 line-clamp-1 text-xs text-slate-500">{notification.body}</p><p className="mt-1 text-[11px] text-slate-400">{new Date(notification.created_at).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}</p></div><div className="flex shrink-0 flex-col items-end gap-2">{notification.order_id && <Link href={`/orders/${notification.order_id}`} className="text-xs font-semibold text-leaf">Order →</Link>}{!notification.read_at && <form action={markNotificationRead}><input type="hidden" name="notification_id" value={notification.id}/><button className="text-[11px] font-semibold text-slate-400 underline">Mark read</button></form>}</div></li>)}</ul> : <p className="px-5 pb-5 text-sm text-slate-500">You’re all caught up. New updates will appear here.</p>}
        </section>

        {isFarmer && <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-forest">Your produce</h2><Link href="/listings/new" className="text-xs font-semibold text-leaf">Add listing →</Link></div>{myListings?.length ? <div className="mt-3 divide-y divide-emerald-900/10 rounded-2xl border border-emerald-900/10 bg-white px-4">{myListings.slice(0, 4).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-forest">{item.produce_name}</p><p className="mt-1 text-xs text-slate-500">{Math.max(0, Number(item.quantity_available) - Number(item.reserved_quantity) - Number(item.quantity_sold)).toLocaleString()} {item.unit} available · R{Number(item.asking_price).toFixed(2)}</p></div><div className="flex shrink-0 flex-wrap items-center justify-end gap-3"><Link href={`/marketplace/${item.id}`} className="text-xs font-semibold text-leaf">View →</Link><Link href={`/listings/${item.id}/photos`} className="text-xs font-semibold text-leaf">Photos</Link>{(item.status === "active" || item.status === "paused") && <form action={updateListingStatus}><input type="hidden" name="listing_id" value={item.id}/><input type="hidden" name="status" value={item.status === "active" ? "paused" : "active"}/><button className="text-xs font-semibold text-slate-500 underline">{item.status === "active" ? "Pause" : "Reactivate"}</button></form>}</div></div>)}</div> : <p className="mt-3 rounded-xl bg-white p-4 text-sm text-slate-500">No produce listed yet. <Link href="/listings/new" className="font-semibold text-leaf">Add your first listing.</Link></p>}</section>}

        {profile.role === "agent" && <section className="mt-8"><h2 className="text-lg font-bold text-forest">Farmers you assist</h2>{assignedFarmers?.length ? <div className="mt-3 divide-y divide-emerald-900/10 rounded-2xl border border-emerald-900/10 bg-white px-4">{assignedFarmers.slice(0, 4).map((farmer) => <div key={farmer.id} className="flex items-center justify-between py-3"><div><p className="text-sm font-semibold text-forest">{farmer.display_name}</p><p className="text-xs text-slate-500">{farmer.locality || "Vhembe"}</p></div><Link href={`/agent/farmers/${farmer.id}/listing`} className="text-xs font-semibold text-leaf">Add produce →</Link></div>)}</div> : <p className="mt-3 rounded-xl bg-white p-4 text-sm text-slate-500">No farmers registered yet.</p>}</section>}

        {isFarmer && confirmedPreorders.length > 0 && <details className="dashboard-disclosure mt-4"><summary>Confirmed pre-orders <span className="ml-2 text-xs font-medium text-slate-400">{confirmedPreorders.length}</span></summary><div className="mt-4 space-y-3">{confirmedPreorders.map((request: BuyerRequest & {produce_name:string})=><article key={request.id} className="rounded-2xl border border-emerald-900/10 bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold text-forest">{request.produce_name}</h3><p className="mt-1 text-sm text-slate-600">{request.quantity_requested} requested · expected harvest {request.requested_harvest_date||"date not set"}</p><p className="mt-2 text-xs text-slate-700"><strong>Buyer:</strong> {request.buyer_name} · {request.contact_number}</p></div><span className="text-xs font-semibold text-emerald-700">Confirmed</span></div><p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">No stock is reserved for this pre-order. Contact the buyer to confirm the harvest plan, then publish available stock when it is ready.</p></article>)}</div></details>}

        {isFarmer && <details id="buyer-requests" className="dashboard-disclosure mt-4"><summary>Requests to review <span className="ml-2 text-xs font-medium text-slate-400">{pendingRequests.length}</span></summary>{pendingRequests.length ? <div className="mt-4 space-y-3">{pendingRequests.map((request: BuyerRequest & { produce_name: string }) => <article key={request.id} className="rounded-2xl border border-emerald-900/10 bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold text-forest">{request.produce_name}</h3><p className="mt-1 text-sm text-slate-600">{request.quantity_requested} requested{request.proposed_price !== null ? ` · proposed R${Number(request.proposed_price).toFixed(2)}` : ""}</p>{request.request_type==="preorder"&&<p className="mt-1 text-xs font-semibold text-amber-700">Pre-order · expected harvest {request.requested_harvest_date||"date not set"} · confirmation does not reserve stock</p>}<div className="mt-3 grid gap-1 rounded-xl bg-[#f7faf7] p-3 text-xs text-slate-700"><p><strong>Buyer:</strong> {request.buyer_name} · {request.contact_number}</p><p><strong>Fulfilment:</strong> {request.fulfilment_preference}{request.delivery_location ? " · "+request.delivery_location : ""}</p>{request.order_instructions&&<p><strong>Instructions:</strong> {request.order_instructions}</p>}{request.message&&<p><strong>Message:</strong> {request.message}</p>}</div></div><span className="text-xs font-semibold text-amber-700">Pending</span></div>{request.request_type==="preorder" ? <div className="mt-4"><form action={confirmPreorderRequest} className="rounded-xl border border-emerald-900/10 bg-[#f7faf7] p-4"><p className="text-sm font-bold text-forest">Confirm pre-order (no stock reserved)</p><p className="mt-1 text-xs text-slate-600">Confirm that you can plan for this requested harvest. No current stock will be reserved.</p><input type="hidden" name="request_id" value={request.id}/><button className="mt-3 rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white">Confirm pre-order</button></form></div> : <div className="mt-4 grid gap-3"><form action={acceptRequest} className="rounded-xl border border-emerald-900/10 bg-[#f7faf7] p-4"><input type="hidden" name="request_id" value={request.id}/><h4 className="text-sm font-bold text-forest">Accept and schedule fulfilment</h4><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Fulfilment method<select name="fulfilment_method" defaultValue={request.fulfilment_preference||"collection"} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="delivery">Deliver to buyer</option><option value="collection">Buyer collects</option></select></label><label className="text-xs font-semibold text-slate-700">Date and time<input name="scheduled_start" type="datetime-local" required className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-700">End time (optional)<input name="scheduled_end" type="datetime-local" className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-700">Delivery / collection location<input name="fulfilment_location" required minLength={3} maxLength={300} defaultValue={request.delivery_location||""} placeholder="Enter farm, collection point or delivery address" className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-700">Delivery fee (R; 0 if free)<input name="delivery_fee" type="number" min="0" step="0.01" defaultValue="0" className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-700 sm:col-span-2">Instructions for buyer<textarea name="seller_instructions" maxLength={1000} rows={2} placeholder="What should the buyer know?" className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm"/></label></div><p className="mt-2 text-xs text-slate-500">The buyer will receive this schedule. Any delivery fee must be accepted by the buyer before it is agreed.</p><button className="mt-3 rounded-xl bg-forest px-4 py-2.5 text-xs font-bold text-white">Accept order and send schedule</button></form><form action={rejectRequest} className="rounded-xl border border-red-100 p-4"><input type="hidden" name="request_id" value={request.id}/><label className="block text-xs font-semibold text-slate-700">Reason for rejecting<textarea name="rejection_reason" required minLength={3} maxLength={500} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm" placeholder="Briefly explain why you cannot fulfil this request"/></label><button className="mt-2 rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-700">Reject request</button></form></div>}</article>)}</div> : <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-slate-600">No pending requests yet. Your listings will appear in the marketplace for buyers to discover.</p>}</details>}

        {profile.role === "buyer" && <details className="dashboard-disclosure mt-4"><div className="flex items-center justify-between gap-3"><summary>Your buyer requests <span className="ml-2 text-xs font-medium text-slate-400">{buyerRequests.length}</span></summary><Link href="/marketplace" className="text-sm font-bold text-leaf">Find more produce</Link></div>{buyerRequests.length ? <div className="mt-4 space-y-3">{buyerRequests.map((request) => <article key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-900/10 bg-white p-5"><div><h3 className="font-bold text-forest">{request.produce_listings?.produce_name ?? "Produce listing"}</h3><p className="mt-1 text-xs text-slate-500">{request.produce_listings?.locality ?? "Vhembe"} · {request.quantity_requested} requested{request.proposed_price !== null ? ` · offered R${Number(request.proposed_price).toFixed(2)}` : ""}</p>{request.request_type==="preorder"&&<p className="mt-1 text-xs font-semibold text-amber-700">Pre-order · expected harvest {request.requested_harvest_date||"date not set"}</p>}<p className="mt-1 text-xs text-slate-400">{new Date(request.created_at).toLocaleDateString("en-ZA")}</p>{request.rejection_reason&&<p className="mt-2 text-xs text-red-700">Seller reason: {request.rejection_reason}</p>}</div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700">{request.status}</span></article>)}</div> : <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-slate-600">You have not requested any produce yet. Browse the marketplace to contact local farmers.</p>}</details>}

        {profile.role === "buyer" && <details id="orders" className="dashboard-disclosure mt-4"><summary>Orders <span className="ml-2 text-xs font-medium text-slate-400">{buyerOrders.length}</span></summary>{buyerOrders.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{buyerOrders.map((order) => <article key={order.id} className="rounded-2xl border border-emerald-900/10 bg-white p-5"><div className="flex items-center justify-between gap-2"><p className="font-bold text-forest">Order {order.id.slice(0, 8)}</p><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-leaf">{order.fulfilment_state?.replaceAll("_"," ")||order.status}</span></div><p className="mt-2 text-sm text-slate-600">{Number(order.quantity_agreed).toLocaleString()} {order.unit} · R{Number(order.unit_price).toFixed(2)} per {order.unit}</p>{order.scheduled_start && <p className="mt-2 text-xs text-slate-600">{order.fulfilment_method==="delivery"?"Delivery":"Collection"} · {new Date(order.scheduled_start).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"})} · {order.fulfilment_location}</p>}{Number(order.delivery_fee||0)>0 && <p className="mt-1 text-xs text-slate-600">Delivery fee: R{Number(order.delivery_fee).toFixed(2)} {order.status==="accepted"?"(subject to your agreement)":""}</p>}<Link href={`/orders/${order.id}`} className="mt-4 inline-block text-sm font-bold text-leaf">Track order →</Link></article>)}</div> : <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-slate-600">Accepted requests will appear here as orders. No orders yet.</p>}</details>}

        {isFarmer && farmerAllocations.length > 0 && <details id="orders" className="dashboard-disclosure mt-4"><summary>Orders to fulfil <span className="ml-2 text-xs font-medium text-slate-400">{farmerAllocations.length}</span></summary><div className="mt-4 space-y-3">{farmerAllocations.map((allocation) => <article key={allocation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-900/10 bg-white p-5"><div><p className="font-bold text-forest">{allocation.produce_listings?.produce_name ?? "Produce allocation"}</p><p className="mt-1 text-sm text-slate-600">{allocation.quantity_allocated} {allocation.orders?.unit ?? ""} · R{Number(allocation.agreed_unit_price).toFixed(2)} per unit</p><p className="mt-1 text-xs capitalize text-slate-500">Order {allocation.order_id.slice(0, 8)} · {allocation.orders?.fulfilment_state?.replaceAll("_"," ") ?? allocation.orders?.status ?? "unknown"} · allocation {allocation.status}</p>{allocation.orders?.scheduled_start && <p className="mt-2 text-xs text-slate-600">{allocation.orders.fulfilment_method==="delivery"?"Delivery":"Collection"} · {new Date(allocation.orders.scheduled_start).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"})} · {allocation.orders.fulfilment_location}</p>}</div><div className="flex flex-wrap gap-2"><Link href={`/orders/${allocation.order_id}`} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-forest">View order</Link>{allocation.status !== "fulfilled" && allocation.orders?.status === "accepted" && <form action={fulfillAllocation}><input type="hidden" name="allocation_id" value={allocation.id}/><button className="rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white">Mark fulfilled</button></form>}</div></article>)}</div></details>}

        {isFarmer && farmerAllocations.length === 0 && <details id="orders" className="dashboard-disclosure mt-4"><summary>Orders to fulfil <span className="ml-2 text-xs font-medium text-slate-400">0</span></summary><p className="px-4 py-4 text-sm text-slate-500">When a buyer order is accepted, its fulfilment details will appear here.</p></details>}

        <div className="mt-8 border-t border-emerald-900/10 pt-4"><Link href="/privacy" className="text-xs text-slate-500 underline">Privacy notice</Link></div>
      </section>
    </main>
  );
}
