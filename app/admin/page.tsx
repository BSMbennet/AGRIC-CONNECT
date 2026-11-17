import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moderateListing } from "@/actions/admin";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const [farmers, listingsCount, requests, fulfilled, listings] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "farmer"),
    supabase.from("produce_listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("buyer_requests").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "fulfilled"),
    supabase.from("produce_listings").select("id,produce_name,category,locality,quantity_available,unit,asking_price,status,created_at").in("status", ["active", "moderated"]).order("created_at", { ascending: false }).limit(30),
  ]);
  const metrics = [
    ["Farmer accounts", farmers.count ?? 0],
    ["Active listings", listingsCount.count ?? 0],
    ["Buyer requests", requests.count ?? 0],
    ["Fulfilled orders", fulfilled.count ?? 0],
  ];
  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Link href="/dashboard" className="text-sm font-bold text-forest">← Dashboard</Link>
      <h1 className="mt-6 text-3xl font-bold text-forest">Administration</h1>
      <p className="mt-2 text-sm text-slate-600">Live pilot activity and listing moderation.</p>
      {params.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">The moderation action could not be completed.</p>}
      {params.updated && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Listing moderation updated.</p>}
      <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label, value]) => <div key={label} className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-soft"><p className="text-3xl font-bold text-forest">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>)}</section>
      <section className="mt-10"><h2 className="text-xl font-bold text-forest">Recent listings</h2><div className="mt-4 space-y-3">{listings.data?.map((listing) => <article key={listing.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-900/10 bg-white p-4"><div><p className="font-bold text-forest">{listing.produce_name}</p><p className="mt-1 text-xs text-slate-500">{listing.category} · {listing.locality} · {listing.quantity_available} {listing.unit} · R{Number(listing.asking_price).toFixed(2)}</p><p className="mt-1 text-xs capitalize text-slate-400">Status: {listing.status}</p></div><div className="flex gap-2">{listing.status === "active" ? <form action={moderateListing}><input type="hidden" name="listing_id" value={listing.id}/><input type="hidden" name="action" value="moderated"/><button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Moderate</button></form> : <form action={moderateListing}><input type="hidden" name="listing_id" value={listing.id}/><input type="hidden" name="action" value="active"/><button className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-leaf">Restore</button></form>}</div></article>)}</div></section>
    </main>
  );
}
