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

const categories = ["Vegetables", "Fruit", "Grains", "Legumes", "Herbs", "Other"];

export default async function MarketplacePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase
    .from("produce_listings")
    .select("id,produce_name,category,quantity_available,reserved_quantity,quantity_sold,is_organic,unit,asking_price,price_unit,locality,municipality,available_from,harvest_date,quality_notes,created_at,expires_at,image_urls")
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
    <main className="min-h-screen agri-page">
      <AppNav active="marketplace" />

      <section className="bg-forest text-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-200">Vhembe District · Limpopo</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">The local harvest marketplace</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/85">Discover fresh produce listed by local farmers. Compare availability and asking prices, then send a request when you are ready to buy.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-forest hover:bg-emerald-50">Join as a buyer</Link>
            <Link href="/listings/new" className="rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">Sell your harvest</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {params.created && <p role="status" className="mb-5 rounded-xl bg-emerald-100 p-3 text-sm font-medium text-emerald-900">Your produce listing has been published.</p>}
        <form className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-forest"><SlidersHorizontal size={17} /> Find produce</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="relative lg:col-span-2">
              <span className="sr-only">Search produce</span>
              <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
              <input name="q" defaultValue={params.q} placeholder="Search tomatoes, maize, spinach…" className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-leaf" />
            </label>
            <label><span className="sr-only">Locality</span><input name="locality" defaultValue={params.locality} placeholder="Town or locality" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-leaf" /></label>
            <label><span className="sr-only">Category</span><select name="category" defaultValue={params.category || ""} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">All produce categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <label><span className="sr-only">Minimum price</span><input name="min_price" type="number" min="0" step="0.01" defaultValue={params.min_price} placeholder="Min price (R)" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
            <label><span className="sr-only">Maximum price</span><input name="max_price" type="number" min="0" step="0.01" defaultValue={params.max_price} placeholder="Max price (R)" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
            <label><span className="sr-only">Minimum available quantity</span><input name="min_quantity" type="number" min="0" step="0.01" defaultValue={params.min_quantity} placeholder="Min quantity available" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
            <label><span className="sr-only">Available by</span><input name="available_by" type="date" defaultValue={params.available_by} aria-label="Available by" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700" /></label>
            <label><span className="sr-only">Sort listings</span><select name="sort" defaultValue={params.sort || "newest"} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="newest">Newest first</option><option value="price_low">Price: low to high</option><option value="price_high">Price: high to low</option><option value="available">Soonest availability</option></select></label>
            <button className="h-11 rounded-xl bg-forest px-5 text-sm font-bold text-white hover:bg-leaf">Apply filters</button>
            <Link href="/marketplace" className="flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:border-leaf">Clear filters</Link>
          </div>
        </form>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="text-xl font-bold text-forest">Available produce</h2><p className="mt-1 text-sm text-slate-500">{error ? "Marketplace temporarily unavailable" : `${listings.length} listing${listings.length === 1 ? "" : "s"} found`}</p></div>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500"><MapPin size={14} /> Local farmer listings</span>
        </div>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">We could not load the marketplace. Please try again shortly.</div>}
        {!error && listings.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-emerald-900/20 bg-white p-10 text-center"><PackageCheck size={30} className="mx-auto text-leaf" /><p className="mt-3 font-bold text-forest">No matching produce yet</p><p className="mt-2 text-sm text-slate-500">Try a different crop, locality or price range. Farmers can add new harvests at any time.</p><Link href="/marketplace" className="mt-4 inline-block text-sm font-bold text-leaf">View all listings</Link></div>}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((item) => {
            const available = Number(item.quantity_available) - Number(item.reserved_quantity) - Number(item.quantity_sold);
            return (
              <article key={item.id} className="flex flex-col rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-leaf">{item.category}</span>{item.is_organic === null ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Organic status not provided</span> : item.is_organic ? <span className="rounded-full bg-lime-50 px-3 py-1 text-xs font-bold text-lime-800">Farmer-declared organic</span> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Not organic</span>}<span className="text-xs font-semibold text-emerald-700">{available.toLocaleString()} {item.unit} available</span></div>
                {item.image_urls?.[0] ? <img src={item.image_urls[0]} alt={item.produce_name} className="mt-4 aspect-[16/9] w-full rounded-xl object-cover"/> : <div className="mt-4 flex aspect-[16/9] items-center justify-center rounded-xl bg-emerald-50 text-sm text-emerald-800">Product photo coming soon</div>}
                <h3 className="mt-4 text-xl font-bold text-forest"><Link href={`/marketplace/${item.id}`} className="hover:text-leaf">{item.produce_name}</Link></h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} /> {item.locality}{item.municipality ? `, ${item.municipality}` : ""}</p>
                <p className="mt-5 text-2xl font-bold text-forest">R{Number(item.asking_price).toFixed(2)} <span className="text-xs font-medium text-slate-500">/ {item.price_unit}</span></p>
                <p className="mt-2 text-xs text-slate-500">Available from {item.available_from}</p>{item.expires_at&&<p className="mt-1 text-xs font-semibold text-amber-700">Listing expires {new Intl.DateTimeFormat("en-ZA",{dateStyle:"medium",timeStyle:"short"}).format(new Date(item.expires_at))}</p>}
                {item.quality_notes && <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600">{item.quality_notes}</p>}
                <Link href={`/marketplace/${item.id}`} className="mt-5 inline-flex items-center justify-center rounded-xl bg-forest px-4 py-3 text-sm font-bold text-white hover:bg-leaf">View produce details</Link>
                <AddToCartButton listingId={item.id} />
              </article>
            );
          })}
        </div>
        <p className="mt-8 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">Prices, quantities and quality notes are supplied by farmers and are not independently verified. Confirm quality, collection arrangements and final price with the seller before payment. AgricNorthX does not hold payments.</p>
      </section>
    </main>
  );
}
