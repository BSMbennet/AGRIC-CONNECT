import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Search, MapPin, PackageCheck, SlidersHorizontal } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { AddToCartButton } from "@/components/add-to-cart-button";

type SearchParams = Promise<{
  q?: string;
  locality?: string;
  category?: string;
  min_price?: string;
  max_price?: string;
  min_quantity?: string;
  available_by?: string;
  sort?: string;
  created?: string;
}>;

const categories = ["Vegetables", "Fruit", "Grains", "Legumes", "Herbs", "Livestock", "Manure", "Other"];

export default async function MarketplacePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase
    .from("produce_listings")
    .select("id,farmer_id,produce_name,category,quantity_available,reserved_quantity,quantity_sold,is_organic,unit,asking_price,price_unit,locality,municipality,available_from,harvest_date,quality_notes,created_at,expires_at,image_urls")
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (params.q?.trim()) query = query.ilike("produce_name", `%${params.q.trim()}%`);
  if (params.locality?.trim()) query = query.ilike("locality", `%${params.locality.trim()}%`);
  if (params.category) query = query.eq("category", params.category);
  if (params.min_price && Number.isFinite(Number(params.min_price))) query = query.gte("asking_price", Number(params.min_price));
  if (params.max_price && Number.isFinite(Number(params.max_price))) query = query.lte("asking_price", Number(params.max_price));
  if (params.available_by) query = query.lte("available_from", params.available_by);

  if (params.sort === "price_low") query = query.order("asking_price", { ascending: true });
  else if (params.sort === "price_high") query = query.order("asking_price", { ascending: false });
  else if (params.sort === "available") query = query.order("available_from", { ascending: true });
  else query = query.order("created_at", { ascending: false });

  const { data, error } = await query.limit(100);
  const minQuantity = params.min_quantity && Number.isFinite(Number(params.min_quantity)) ? Number(params.min_quantity) : 0;
  const listings = (data ?? []).filter((item) => {
    const available = Number(item.quantity_available) - Number(item.reserved_quantity) - Number(item.quantity_sold);
    return available > 0 && available >= minQuantity;
  });

  return (
    <main className="min-h-screen agri-page scene-market">
      <AppNav active="marketplace" />

      <section className="market-hero">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-lime">Vhembe District · Limpopo</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">The local harvest marketplace</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/80 sm:text-base">Discover fresh produce listed by local farmers. Compare availability and asking prices, then send a request when you are ready to buy.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="rounded-full bg-lime px-5 py-3 text-sm font-extrabold text-forest transition hover:bg-white">Join as a buyer</Link>
            <Link href="/listings/new" className="rounded-full border border-white/40 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15">Sell products</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {params.created && <p role="status" className="mb-5 rounded-xl bg-emerald-100 p-3 text-sm font-medium text-emerald-900">Your produce listing has been published.</p>}
        <form className="rounded-3xl border border-emerald-950/10 bg-white p-4 shadow-soft sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-forest"><SlidersHorizontal size={17} /> Find products</div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(150px,1fr)_auto_auto]">
            <label className="relative">
              <span className="sr-only">Search produce</span>
              <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
              <input name="q" defaultValue={params.q} placeholder="Search tomatoes, maize, spinach…" className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/15" />
            </label>
            <label><span className="sr-only">Locality</span><input name="locality" defaultValue={params.locality} placeholder="Town or locality" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/15" /></label>
            <label><span className="sr-only">Category</span><select name="category" defaultValue={params.category || ""} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-leaf"><option value="">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <button className="h-11 rounded-xl bg-forest px-5 text-sm font-bold text-white transition hover:bg-leaf">Search</button>
          </div>
          <details className="mt-3 rounded-xl bg-[#F5F7F0] px-3 py-2">
            <summary className="cursor-pointer py-1 text-xs font-bold text-forest">More filters and sorting</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label><span className="mb-1 block text-[11px] font-semibold text-slate-500">Minimum price (R)</span><input name="min_price" type="number" min="0" step="0.01" defaultValue={params.min_price} placeholder="Any" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" /></label>
              <label><span className="mb-1 block text-[11px] font-semibold text-slate-500">Maximum price (R)</span><input name="max_price" type="number" min="0" step="0.01" defaultValue={params.max_price} placeholder="Any" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" /></label>
              <label><span className="mb-1 block text-[11px] font-semibold text-slate-500">Minimum quantity</span><input name="min_quantity" type="number" min="0" step="0.01" defaultValue={params.min_quantity} placeholder="Any" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" /></label>
              <label><span className="mb-1 block text-[11px] font-semibold text-slate-500">Available by</span><input name="available_by" type="date" defaultValue={params.available_by} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700" /></label>
              <label><span className="mb-1 block text-[11px] font-semibold text-slate-500">Sort listings</span><select name="sort" defaultValue={params.sort || "newest"} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="newest">Newest first</option><option value="price_low">Price: low to high</option><option value="price_high">Price: high to low</option><option value="available">Soonest availability</option></select></label>
            </div>
          </details>
          <div className="mt-3 flex justify-end"><Link href="/marketplace" className="text-xs font-semibold text-slate-500 underline underline-offset-4 hover:text-forest">Clear all filters</Link></div>
        </form>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="text-xl font-bold text-forest">Available products</h2><p className="mt-1 text-sm text-slate-500">{error ? "Marketplace temporarily unavailable" : `${listings.length} listing${listings.length === 1 ? "" : "s"} found`}</p></div>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500"><MapPin size={14} /> Local farmer listings</span>
        </div>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">We could not load the marketplace. Please try again shortly.</div>}
        {!error && listings.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-emerald-900/20 bg-white p-10 text-center"><PackageCheck size={30} className="mx-auto text-leaf" /><p className="mt-3 font-bold text-forest">No matching produce yet</p><p className="mt-2 text-sm text-slate-500">Try a different crop, locality or price range. Farmers can add new harvests at any time.</p><Link href="/marketplace" className="mt-4 inline-block text-sm font-bold text-leaf">View all listings</Link></div>}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((item) => {
            const available = Number(item.quantity_available) - Number(item.reserved_quantity) - Number(item.quantity_sold);
            return (
              <article key={item.id} className="card-lift flex flex-col rounded-3xl border border-emerald-900/10 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-leaf">{item.category}</span>{item.is_organic === null ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Organic status not provided</span> : item.is_organic ? <span className="rounded-full bg-lime-50 px-3 py-1 text-xs font-bold text-lime-800">Farmer-declared organic</span> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Not organic</span>}<span className="text-xs font-semibold text-emerald-700">{available.toLocaleString()} {item.unit} available</span></div>
                {item.image_urls?.[0] ? <img src={item.image_urls[0]} alt={item.produce_name} loading="lazy" decoding="async" className="mt-4 aspect-[16/9] w-full rounded-2xl object-cover"/> : <div className="mt-4 flex aspect-[16/9] items-end rounded-2xl bg-[#E7F0E2] bg-cover bg-center p-4 text-sm font-bold text-forest" style={{ backgroundImage: "linear-gradient(0deg,rgba(245,247,240,.75),rgba(245,247,240,.05)),url(/scenes/harvest.svg)" }}>Fresh from local farms</div>}
                <h3 className="mt-4 text-xl font-extrabold tracking-tight text-forest"><Link href={`/marketplace/${item.id}`} className="hover:text-leaf">{item.produce_name}</Link></h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} /> {item.locality}{item.municipality ? `, ${item.municipality}` : ""}</p>
                <p className="mt-5 text-2xl font-extrabold tracking-tight text-forest">R{Number(item.asking_price).toFixed(2)} <span className="text-xs font-medium text-slate-500">/ {item.price_unit}</span></p>
                <p className="mt-2 text-xs text-slate-500">Available from {item.available_from}</p>{item.expires_at&&<p className="mt-1 text-xs font-semibold text-amber-700">Listing expires {new Intl.DateTimeFormat("en-ZA",{dateStyle:"medium",timeStyle:"short"}).format(new Date(item.expires_at))}</p>}
                {item.quality_notes && <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600">{item.quality_notes}</p>}
                <Link href={`/marketplace/${item.id}`} className="mt-5 inline-flex items-center justify-center rounded-xl bg-forest px-4 py-3 text-sm font-bold text-white hover:bg-leaf">View produce details</Link>
                <AddToCartButton listingId={item.id} sellerId={item.farmer_id} currentUserId={user?.id} />
              </article>
            );
          })}
        </div>
        <p className="mt-8 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">Prices, quantities and quality notes are supplied by farmers and are not independently verified. Confirm quality, collection arrangements and final price with the seller before payment. AgricNorthX does not hold payments.</p>
      </section>
    </main>
  );
}
