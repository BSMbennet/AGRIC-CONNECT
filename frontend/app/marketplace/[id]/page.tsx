import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createBuyerRequest } from "@/actions/requests";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function ListingDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const queryParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: listing } = await supabase.from("produce_listings")
    .select("id,farmer_id,produce_name,category,quantity_available,reserved_quantity,quantity_sold,unit,asking_price,price_unit,available_from,harvest_date,expires_at,quality_notes,locality,municipality,district,status")
    .eq("id", id).single();
  if (!listing || listing.status !== "active") notFound();
  const available = Number(listing.quantity_available) - Number(listing.reserved_quantity) - Number(listing.quantity_sold);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const canRequest = profile?.role === "buyer" && listing.farmer_id !== user.id && available > 0;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/marketplace" className="text-sm font-bold text-forest">← Marketplace</Link>
      <article className="mt-6 rounded-3xl border border-emerald-900/10 bg-white p-7 shadow-soft">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-leaf">{listing.category}</span>
        <h1 className="mt-4 text-3xl font-bold text-forest">{listing.produce_name}</h1>
        <p className="mt-2 text-sm text-slate-500">{listing.locality}{listing.municipality ? `, ${listing.municipality}` : ""} · {listing.district}</p>
        <p className="mt-6 text-3xl font-bold text-forest">R{Number(listing.asking_price).toFixed(2)} <span className="text-sm font-medium text-slate-500">per {listing.price_unit}</span></p>
        <p className="mt-2 text-sm text-slate-600">{available.toLocaleString()} {listing.unit} available</p>
        <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl bg-cream p-4 text-sm"><div><dt className="text-slate-500">Available from</dt><dd className="mt-1 font-semibold text-forest">{listing.available_from}</dd></div><div><dt className="text-slate-500">Harvested</dt><dd className="mt-1 font-semibold text-forest">{listing.harvest_date || "Not specified"}</dd></div></dl>
        {listing.quality_notes && <p className="mt-6 text-sm leading-6 text-slate-600">{listing.quality_notes}</p>}
        <p className="mt-5 text-xs leading-5 text-slate-500">Listing details and prices are farmer-provided and not independently verified. Exact farm location and private contact details are not shown.</p>
      </article>
      {queryParams.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">We could not submit that request. Check the quantity and try again.</p>}
      {canRequest ? <form action={createBuyerRequest} className="mt-6 rounded-2xl border border-emerald-900/10 bg-white p-6">
        <h2 className="font-bold text-forest">Request this produce</h2>
        <input type="hidden" name="listing_id" value={listing.id}/>
        <label className="mt-4 block text-sm font-semibold text-slate-700">Quantity ({listing.unit})<Input name="quantity_requested" type="number" min="0.01" max={available} step="0.01" required className="mt-2"/></label>
        <label className="mt-4 block text-sm font-semibold text-slate-700">Proposed price per {listing.price_unit} (optional)<Input name="proposed_price" type="number" min="0" step="0.01" className="mt-2" placeholder={Number(listing.asking_price).toFixed(2)}/></label>
        <label className="mt-4 block text-sm font-semibold text-slate-700">Message (optional)<textarea name="message" maxLength={500} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="When would you like to collect?"/></label>
        <Button type="submit" className="mt-5 w-full">Send buyer request</Button>
      </form> : <p className="mt-6 rounded-2xl bg-white p-5 text-sm text-slate-600">{profile?.role !== "buyer" ? "Sign in with a buyer account to request this produce." : "No stock is currently available."}</p>}
    </main>
  );
}
