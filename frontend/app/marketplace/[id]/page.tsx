import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createBuyerRequest } from "@/actions/requests";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Sprout } from "lucide-react";

type PublicListing = {
  id: string;
  produce_name: string;
  category: string;
  is_organic: boolean;
  quantity_available: number;
  reserved_quantity: number;
  quantity_sold: number;
  unit: string;
  asking_price: number;
  currency: string;
  price_unit: string;
  available_from: string;
  harvest_date: string | null;
  expires_at: string | null;
  quality_notes: string | null;
  locality: string;
  municipality: string | null;
  district: string | null;
  status: string;
  farmer_id?: string;
  image_urls?: string[];
};

const publicColumns = "id,produce_name,category,is_organic,quantity_available,reserved_quantity,quantity_sold,unit,asking_price,currency,price_unit,available_from,harvest_date,expires_at,quality_notes,locality,municipality,district,status,image_urls";

export default async function ListingDetailPage({
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

  let listing: PublicListing | null = null;
  if (user) {
    const { data } = await supabase.from("produce_listings")
      .select("id,produce_name,category,is_organic,quantity_available,reserved_quantity,quantity_sold,unit,asking_price,currency,price_unit,available_from,harvest_date,expires_at,quality_notes,locality,municipality,district,status,farmer_id,image_urls")
      .eq("id", id).maybeSingle();
    listing = data;
  } else {
    const { data } = await supabase.from("produce_listings")
      .select(publicColumns)
      .eq("id", id).eq("status", "active").maybeSingle();
    listing = data;
  }

  if (!listing || (listing.status !== "active" && listing.farmer_id !== user?.id) || (listing.expires_at && new Date(listing.expires_at).getTime() <= Date.now())) notFound();

  const available = Number(listing.quantity_available) - Number(listing.reserved_quantity) - Number(listing.quantity_sold);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  const isAvailableNow = listing.available_from <= today && available > 0;
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const canRequest = !!user && profile?.role === "buyer" && listing.farmer_id !== user.id && isAvailableNow;

  return (
    <main className="min-h-screen bg-[#f7faf7]">
      <header className="border-b border-emerald-900/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-forest"><Sprout size={21} /> AgriConnect</Link>
          <nav className="flex items-center gap-4 text-sm font-semibold"><Link href="/marketplace" className="text-forest hover:text-leaf">Marketplace</Link><Link href={user ? "/dashboard" : "/login"} className="text-forest hover:text-leaf">{user ? "Dashboard" : "Sign in"}</Link>{user && <Link href="/profile" className="text-forest hover:text-leaf">Profile</Link>}</nav>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-5 py-8 sm:py-10">
        <Link href="/marketplace" className="text-sm font-bold text-leaf">← Back to marketplace</Link>
        <article className="mt-5 rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-leaf">{listing.category}</span><span className="text-xs font-semibold text-slate-500">Farmer-listed produce</span></div>
          {listing.image_urls?.length ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{listing.image_urls.map((url,index)=><img key={url} src={url} alt={listing.produce_name+" photo "+(index+1)} className="aspect-square w-full rounded-xl object-cover"/>)}</div> : <div className="mt-5 rounded-xl bg-[#f7faf7] p-6 text-center text-sm text-slate-500">No product photos added yet.</div>}
          <h1 className="mt-4 text-3xl font-bold text-forest">{listing.produce_name}</h1>
          <p className="mt-2 inline-flex rounded-full bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-800">{listing.is_organic ? "Farmer-declared organic (not independently certified)" : "Farmer declares this produce is not organic"}</p>
          <p className="mt-2 flex items-center gap-1 text-sm text-slate-500"><MapPin size={15} /> {listing.locality}{listing.municipality ? `, ${listing.municipality}` : ""}{listing.district ? ` · ${listing.district}` : ""}</p>
          <p className="mt-7 text-3xl font-bold text-forest">R{Number(listing.asking_price).toFixed(2)} <span className="text-sm font-medium text-slate-500">per {listing.price_unit}</span></p>
          <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">{available.toLocaleString()} {listing.unit} available</span>{!isAvailableNow && available > 0 && <span className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800">Available from {listing.available_from}</span>}</div>
          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl bg-[#f7faf7] p-4 text-sm"><div><dt className="text-slate-500">Available from</dt><dd className="mt-1 font-semibold text-forest">{listing.available_from}</dd></div><div><dt className="text-slate-500">Harvest date</dt><dd className="mt-1 font-semibold text-forest">{listing.harvest_date || "Not specified"}</dd></div></dl>
          {listing.quality_notes && <div className="mt-6"><h2 className="font-bold text-forest">Quality and harvest notes</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{listing.quality_notes}</p></div>}
          <p className="mt-6 text-xs leading-5 text-slate-500">The seller&apos;s exact farm location and private contact details are not displayed publicly. Prices and produce descriptions are farmer-provided and should be confirmed before purchase.</p>
        </article>

        {queryParams.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">We could not submit your request. Please check the quantity and try again.</p>}
        {canRequest ? (
          <form action={createBuyerRequest} className="mt-5 rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-forest">Request this produce</h2>
            <p className="mt-1 text-sm text-slate-500">Your request goes to the farmer. Stock is reserved only after the farmer accepts.</p>
            <input type="hidden" name="listing_id" value={listing.id} />
            <label className="mt-4 block text-sm font-semibold text-slate-700">Quantity ({listing.unit})<Input name="quantity_requested" type="number" min="0.01" max={available} step="0.01" required className="mt-2" /></label>
            <label className="mt-4 block text-sm font-semibold text-slate-700">Proposed price per {listing.price_unit} (optional)<Input name="proposed_price" type="number" min="0" step="0.01" className="mt-2" placeholder={Number(listing.asking_price).toFixed(2)} /></label>
            <label className="mt-4 block text-sm font-semibold text-slate-700">Message to farmer (optional)<textarea name="message" maxLength={500} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Ask about collection times or produce quality…" /></label>
            <Button type="submit" className="mt-5 w-full">Send buyer request</Button>
          </form>
        ) : (
          <div className="mt-5 rounded-2xl border border-emerald-900/10 bg-white p-6">
            {!user ? <><h2 className="font-bold text-forest">Interested in this harvest?</h2><p className="mt-2 text-sm text-slate-600">Create a buyer account or sign in to send a request to the farmer.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/register" className="rounded-xl bg-forest px-5 py-3 text-sm font-bold text-white">Register as buyer</Link><Link href="/login" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-forest">Sign in</Link></div></> :
              profile?.role !== "buyer" ? <p className="text-sm text-slate-600">Buyer accounts can request produce. Your current account is not registered as a buyer.</p> :
              listing.farmer_id === user.id ? <p className="text-sm text-slate-600">You cannot request your own listing.</p> :
              <p className="text-sm text-slate-600">This produce is not currently available for requests.</p>}
          </div>
        )}
      </section>
    </main>
  );
}
