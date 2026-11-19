import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListingEditForm, type EditableListing } from "@/components/listing-edit-form";
import { ListingPhotoUploader } from "@/components/listing-photo-uploader";
import { RemoveListingButton } from "@/components/remove-listing-button";

export const metadata = { title: "Edit product | AgricNorthX" };
const ERRORS: Record<string, string> = {
  invalid: "Some details are not valid. Please check the form and try again.",
  quantity: "Quantity cannot be lower than the amount already reserved or sold.",
  save: "We could not save your changes. Please try again.",
};

export default async function EditListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const tp = await getTranslations("products");
  const { id } = await params; const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: l } = await supabase.from("produce_listings")
    .select("id,farmer_id,produce_name,category,is_organic,quantity_available,unit,asking_price,price_unit,harvest_date,available_from,expires_at,locality,municipality,district,quality_notes,image_urls,status")
    .eq("id", id).maybeSingle();
  if (!l || l.farmer_id !== user.id) notFound();
  const { data: priv } = await supabase.from("listing_private_details").select("contact_phone,fulfilment_details").eq("listing_id", id).maybeSingle();
  const listing: EditableListing = {
    id: l.id, produce_name: l.produce_name, category: l.category, is_organic: l.is_organic, quantity_available: Number(l.quantity_available), unit: l.unit,
    asking_price: Number(l.asking_price), price_unit: l.price_unit, harvest_date: l.harvest_date, available_from: l.available_from, expires_at: l.expires_at,
    locality: l.locality, municipality: l.municipality, district: l.district, quality_notes: l.quality_notes,
    contact_phone: priv?.contact_phone ?? "", fulfilment_details: priv?.fulfilment_details ?? "",
  };
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <Link href="/farm-products" className="text-sm font-bold text-leaf">← My products</Link>
      <h1 className="mt-4 text-3xl font-bold text-forest">Edit {l.produce_name}</h1>
      <p className="mt-1 text-sm text-slate-600">Change any detail below, update your photos, or remove this product.</p>
      {sp.saved && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">Changes saved.</p>}
      {sp.error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{ERRORS[sp.error] ?? ERRORS.save}</p>}
      <div className="mt-6"><ListingEditForm listing={listing} /></div>
      <ListingPhotoUploader listingId={l.id} existingUrls={l.image_urls ?? []} />
      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-rose-200 bg-white p-5">
        <p className="text-sm text-slate-600">Remove this product from the marketplace.</p><RemoveListingButton listingId={l.id} name={l.produce_name} confirmText={tp("removeConfirm", { name: l.produce_name })} label={tp("remove")} ariaLabel={tp("removeAria", { name: l.produce_name })} />
        <Link href={"/marketplace/" + l.id} className="ml-auto text-sm font-semibold text-leaf">View public listing →</Link>
      </div>
    </main>
  );
}
