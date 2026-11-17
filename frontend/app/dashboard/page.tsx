import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";
import { acceptRequest, rejectRequest } from "@/actions/orders";
import { Sprout, ShoppingBasket, PlusCircle, Layers3, ShieldCheck } from "lucide-react";
import { SyncBadge } from "@/components/sync-badge";
import { LanguageSelector } from "@/components/language-selector";

type BuyerRequest = {
  id: string;
  buyer_id: string;
  quantity_requested: number;
  proposed_price: number | null;
  message: string | null;
  created_at: string;
  status: string;
};

type ListingWithRequests = {
  produce_name: string;
  buyer_requests: BuyerRequest[] | null;
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string; requested?: string; rejected?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("display_name, role, locality, cooperative_id").eq("id", user.id).single();
  if (!profile) redirect("/register?error=profile");

  const isFarmer = profile.role === "farmer";
  const { count: listingCount } = await supabase.from("produce_listings").select("*", { count: "exact", head: true }).eq("farmer_id", user.id);
  const { data: listings } = isFarmer ? await supabase.from("produce_listings")
    .select("id,produce_name,buyer_requests!inner(id,buyer_id,quantity_requested,proposed_price,message,created_at,status)")
    .eq("farmer_id", user.id).eq("buyer_requests.status", "pending").order("created_at", { ascending: false, foreignTable: "buyer_requests" }) : { data: [] };
  const pendingRequests = (listings ?? []).flatMap((listing: ListingWithRequests) => (listing.buyer_requests ?? []).map((request: BuyerRequest) => ({ ...request, produce_name: listing.produce_name })));
  const { count: buyerRequestCount } = isFarmer ? { count: pendingRequests.length } : await supabase.from("buyer_requests").select("id", { count: "exact", head: true }).eq("buyer_id", user.id);
  const { data: assignedFarmers } = profile.role === "agent" ? await supabase.from("profiles").select("id,display_name,locality").eq("created_by_agent_id", user.id).order("created_at", { ascending: false }) : { data: [] };

  return (
    <main className="min-h-screen">
      <header className="border-b border-emerald-900/10 bg-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4"><Link href="/" className="font-bold text-forest">AgriConnect</Link><div className="flex flex-wrap items-center gap-3"><SyncBadge/><LanguageSelector/><form action={logout}><button className="text-sm font-semibold text-slate-600 hover:text-forest">Sign out</button></form></div></div></header>
      <section className="mx-auto max-w-6xl px-5 py-10">
        <p className="text-sm font-semibold capitalize text-leaf">Your workspace · {profile.role.replaceAll("_", " ")}</p>
        <h1 className="mt-2 text-3xl font-bold text-forest">Hello, {profile.display_name}</h1>
        <p className="mt-2 text-slate-600">{profile.locality || "Vhembe"}, Limpopo</p>
        {params.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.error === "insufficient_stock" ? "Not enough stock remains to accept that request." : "The requested action could not be completed."}</p>}
        {params.requested && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Your buyer request has been sent.</p>}
        {params.rejected && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">The buyer request was rejected.</p>}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {isFarmer ? <div className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-soft"><Sprout className="text-leaf" /><p className="mt-4 text-3xl font-bold text-forest">{listingCount ?? 0}</p><p className="text-sm text-slate-600">Your produce listings</p><Link href="/listings/new" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-leaf"><PlusCircle size={17}/> Add produce</Link></div> : <div className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-soft"><ShoppingBasket className="text-leaf"/><p className="mt-4 text-3xl font-bold text-forest">Marketplace</p><p className="text-sm text-slate-600">Discover produce available nearby.</p><Link href="/marketplace" className="mt-5 inline-block text-sm font-bold text-leaf">Browse listings →</Link></div>}
          <div className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-soft"><p className="text-3xl font-bold text-forest">{buyerRequestCount ?? 0}</p><p className="text-sm text-slate-600">{isFarmer ? "Pending buyer requests" : "Your buyer requests"}</p></div>
        </div>
        {profile.role === "agent" && <section className="mt-10"><h2 className="text-xl font-bold text-forest">Farmers you assist</h2>{assignedFarmers?.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{assignedFarmers.map((farmer) => <article key={farmer.id} className="rounded-2xl border border-emerald-900/10 bg-white p-5"><p className="font-bold text-forest">{farmer.display_name}</p><p className="mt-1 text-xs text-slate-500">{farmer.locality || "Vhembe"}</p><Link href={`/agent/farmers/${farmer.id}/listing`} className="mt-4 inline-flex rounded-lg bg-forest px-3 py-2 text-xs font-bold text-white">Add farmer produce</Link></article>)}</div> : <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-slate-600">You have not registered any farmers yet. <Link href="/agent/register-farmer" className="font-bold text-leaf">Register a farmer</Link>.</p>}</section>}
        {isFarmer && <section className="mt-10"><h2 className="text-xl font-bold text-forest">Buyer requests</h2>{pendingRequests.length ? <div className="mt-4 space-y-3">{pendingRequests.map((request: BuyerRequest & { produce_name: string }) => <article key={request.id} className="rounded-2xl border border-emerald-900/10 bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold text-forest">{request.produce_name}</h3><p className="mt-1 text-sm text-slate-600">{request.quantity_requested} requested{request.proposed_price !== null ? ` · proposed R${Number(request.proposed_price).toFixed(2)}` : ""}</p>{request.message && <p className="mt-2 text-sm text-slate-500">{request.message}</p>}</div><span className="text-xs font-semibold text-amber-700">Pending</span></div><div className="mt-4 flex gap-2"><form action={acceptRequest}><input type="hidden" name="request_id" value={request.id}/><button className="rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white">Accept & reserve stock</button></form><form action={rejectRequest}><input type="hidden" name="request_id" value={request.id}/><button className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Reject</button></form></div></article>)}</div> : <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-slate-600">No pending requests yet. Your listings will appear in the marketplace for buyers to discover.</p>}</section>}
        {(profile.role === "buyer" || profile.role === "cooperative_manager") && <Link href="/coop/aggregate" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white px-5 py-3 text-sm font-bold text-forest"><Layers3 size={17}/> Combine supply from farmers</Link>}
        {profile.role === "admin" && <Link href="/admin" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white px-5 py-3 text-sm font-bold text-forest"><ShieldCheck size={17}/> Open admin console</Link>}
        <div className="mt-10 border-t border-emerald-900/10 pt-5"><Link href="/privacy" className="text-xs text-slate-500 underline">Privacy notice</Link></div>
      </section>
    </main>
  );
}
