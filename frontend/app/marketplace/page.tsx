import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Search } from "lucide-react";

type SearchParams = Promise<{ q?: string; locality?: string; category?: string; min_price?: string; max_price?: string; min_quantity?: string; available_by?: string; created?: string }>;

export default async function MarketplacePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("produce_listings")
    .select("id, produce_name, category, quantity_available, reserved_quantity, quantity_sold, unit, asking_price, price_unit, locality, available_from, quality_notes, created_at")
    .eq("status", "active").order("created_at", { ascending: false });
  if (params.q?.trim()) query = query.ilike("produce_name", `%${params.q.trim()}%`);
  if (params.locality?.trim()) query = query.ilike("locality", `%${params.locality.trim()}%`);
  if (params.category) query = query.eq("category", params.category);
  if (params.min_price && Number.isFinite(Number(params.min_price))) query = query.gte("asking_price", Number(params.min_price));
  if (params.max_price && Number.isFinite(Number(params.max_price))) query = query.lte("asking_price", Number(params.max_price));
  if (params.min_quantity && Number.isFinite(Number(params.min_quantity))) query = query.gte("quantity_available", Number(params.min_quantity));
  if (params.available_by) query = query.lte("available_from", params.available_by);
  const { data: listings, error } = await query.limit(60);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3"><Link href="/" className="font-bold text-forest">AgriConnect</Link><Link href="/dashboard" className="text-sm font-semibold text-forest">Dashboard</Link></header>
      <h1 className="mt-9 text-3xl font-bold text-forest">Fresh from local farms</h1>
      <p className="mt-2 text-sm text-slate-600">Discover farmer-provided produce in Vhembe District.</p>
      {params.created && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Your listing is published.</p>}
      <form className="mt-6 grid gap-3 rounded-2xl border border-emerald-900/10 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative lg:col-span-2"><Search size={16} className="absolute left-3 top-3.5 text-slate-400"/><input name="q" defaultValue={params.q} placeholder="Search crop or produce..." className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-leaf"/></label>
        <input name="locality" defaultValue={params.locality} placeholder="Locality (e.g. Thohoyandou)" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-leaf"/>
        <select name="category" defaultValue={params.category || ""} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">All categories</option><option>Vegetables</option><option>Fruit</option><option>Grains</option><option>Legumes</option><option>Herbs</option><option>Other</option></select>
        <input name="min_price" type="number" min="0" step="0.01" defaultValue={params.min_price} placeholder="Min price (R)" className="h-11 rounded-xl border border-slate-200 px-3 text-sm"/>
        <input name="max_price" type="number" min="0" step="0.01" defaultValue={params.max_price} placeholder="Max price (R)" className="h-11 rounded-xl border border-slate-200 px-3 text-sm"/>
        <input name="min_quantity" type="number" min="0" step="0.01" defaultValue={params.min_quantity} placeholder="Min listed quantity" className="h-11 rounded-xl border border-slate-200 px-3 text-sm"/>
        <label className="text-xs text-slate-500">Available by<input name="available_by" type="date" defaultValue={params.available_by} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700"/></label>
        <button className="rounded-xl bg-forest px-5 py-2 text-sm font-bold text-white">Apply filters</button>
      </form>
      {error && <p role="alert" className="mt-5 text-sm text-red-700">Listings could not be loaded. Configure the AgriConnect Supabase project to continue.</p>}
      {!error && listings?.length === 0 && <div className="mt-8 rounded-2xl border border-dashed border-emerald-900/20 bg-white p-10 text-center"><p className="font-bold text-forest">No matching produce yet</p><p className="mt-2 text-sm text-slate-500">Check another locality or come back as farmers publish their harvest.</p></div>}
      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings?.map((item) => {
          const available = Number(item.quantity_available) - Number(item.reserved_quantity) - Number(item.quantity_sold);
          return <article key={item.id} className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-soft">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-leaf">{item.category}</span>
            <h2 className="mt-4 text-xl font-bold text-forest"><Link href={`/marketplace/${item.id}`} className="hover:text-leaf">{item.produce_name}</Link></h2>
            <p className="mt-1 text-sm text-slate-500">{item.locality}</p>
            <p className="mt-5 text-2xl font-bold text-forest">R{Number(item.asking_price).toFixed(2)} <span className="text-xs font-medium text-slate-500">/ {item.price_unit}</span></p>
            <p className="mt-2 text-sm text-slate-600">{available.toLocaleString()} {item.unit} available</p>
            {item.quality_notes && <p className="mt-3 line-clamp-2 text-sm text-slate-500">{item.quality_notes}</p>}
            <p className="mt-4 text-xs text-slate-400">Farmer-provided information · confirm before purchase</p>
          </article>;
        })}
      </section>
    </main>
  );
}
