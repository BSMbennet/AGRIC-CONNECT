import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateListingStatus } from "@/actions/listings";
import { RemoveListingButton } from "@/components/remove-listing-button";

const NOTICES: Record<string, string> = {
  deleted: "Product removed.",
  paused: "This product already has orders or requests, so it was paused and hidden from the marketplace. Order history is kept.",
};

/** The signed-in farmer's own products, with add / edit / photos / pause / remove. Renders nothing for other roles. */
export async function MyProducts({ removed, error }: { removed?: string; error?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "farmer") return null;
  const { data: items, error: loadError } = await supabase.from("produce_listings")
    .select("id,produce_name,category,status,quantity_available,reserved_quantity,quantity_sold,unit,asking_price,price_unit,image_urls")
    .eq("farmer_id", user.id).order("created_at", { ascending: false });
  const list = items ?? [];
  return (
    <section id="my-products" aria-labelledby="my-products-heading" className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="my-products-heading" className="text-xl font-bold text-forest">My products</h2>
          <p className="text-sm text-slate-600">Everything you sell. Edit details, change photos, pause or remove a product.</p>
        </div>
        <Link href="/listings/new" className="rounded-xl bg-forest px-5 py-3 text-sm font-bold text-white hover:bg-leaf">Add a product</Link>
      </div>
      {removed && NOTICES[removed] && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{NOTICES[removed]}</p>}
      {(error || loadError) && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{loadError ? "We could not load your products. Please try again." : "That action could not be completed. Please try again."}</p>}
      {!loadError && list.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-emerald-900/20 bg-white p-8 text-center">
          <p className="font-semibold text-forest">You have not listed any products yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">Add your first product with a photo, price and quantity so buyers can find it.</p>
          <Link href="/listings/new" className="mt-4 inline-block rounded-xl bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-leaf">Add your first product</Link>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => {
            const available = Math.max(0, Number(p.quantity_available) - Number(p.reserved_quantity) - Number(p.quantity_sold));
            return (
              <li key={p.id} className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white">
                {p.image_urls?.[0]
                  ? <img src={p.image_urls[0]} alt={p.produce_name} loading="lazy" className="aspect-[16/9] w-full object-cover" />
                  : <div className="flex aspect-[16/9] items-center justify-center bg-[#E7F0E2] text-sm font-semibold text-forest">No photo yet</div>}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-forest">{p.produce_name}</h3>
                    <span className={"shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold " + (p.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600")}>{p.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{p.category}</p>
                  <p className="mt-2 text-sm text-slate-700">R{Number(p.asking_price).toFixed(2)} per {p.price_unit} · {available.toLocaleString()} {p.unit} available</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Link href={`/listings/${p.id}/edit`} className="text-xs font-semibold text-leaf underline">Edit</Link>
                    <Link href={`/listings/${p.id}/photos`} className="text-xs font-semibold text-leaf underline">Photos</Link>
                    <Link href={`/marketplace/${p.id}`} className="text-xs font-semibold text-leaf underline">View</Link>
                    {(p.status === "active" || p.status === "paused") && (
                      <form action={updateListingStatus}>
                        <input type="hidden" name="listing_id" value={p.id} /><input type="hidden" name="status" value={p.status === "active" ? "paused" : "active"} />
                        <button className="text-xs font-semibold text-slate-600 underline">{p.status === "active" ? "Pause" : "Reactivate"}</button>
                      </form>
                    )}
                    <RemoveListingButton listingId={p.id} name={p.produce_name} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
