"use client";
import { useMemo, useState } from "react";
import { updateListing } from "@/actions/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type EditableListing = {
  id: string; produce_name: string; category: string; is_organic: boolean | null; quantity_available: number; unit: string;
  asking_price: number; price_unit: string; harvest_date: string | null; available_from: string; expires_at: string | null;
  locality: string; municipality: string | null; district: string | null; quality_notes: string | null;
  contact_phone: string; fulfilment_details: string;
};
const CATEGORIES = ["Vegetables", "Fruit", "Grains", "Legumes", "Herbs", "Livestock", "Manure", "Other"];
const unitsFor = (category: string) => category === "Livestock" ? ["head"] : category === "Manure" ? ["kg", "bag", "ton"] : ["kg", "bunch", "crate", "bag"];
const sel = "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm";
const lab = "text-sm font-semibold text-slate-700";

export function ListingEditForm({ listing }: { listing: EditableListing }) {
  const [category, setCategory] = useState(CATEGORIES.includes(listing.category) ? listing.category : "Other");
  const [unit, setUnit] = useState(listing.unit);
  const [priceUnit, setPriceUnit] = useState(listing.price_unit);
  const options = useMemo(() => unitsFor(category), [category]);
  function changeCategory(v: string) { const u = unitsFor(v); setCategory(v); if (!u.includes(unit)) setUnit(u[0]); if (!u.includes(priceUnit)) setPriceUnit(u[0]); }
  const expiry = listing.expires_at ? new Date(listing.expires_at).toISOString().slice(0, 16) : "";
  return (
    <form action={updateListing} className="grid gap-4 rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-soft sm:grid-cols-2">
      <input type="hidden" name="listing_id" value={listing.id} />
      <label className={lab}>Product / livestock name<Input name="produce_name" required minLength={2} maxLength={100} defaultValue={listing.produce_name} className="mt-2" /></label>
      <label className={lab}>Category<select name="category" value={category} onChange={(e) => changeCategory(e.target.value)} required className={sel}>{CATEGORIES.map((x) => <option key={x}>{x}</option>)}</select></label>
      <label className={lab}>Organic status<select name="is_organic" required defaultValue={String(!!listing.is_organic)} className={sel}><option value="true">Yes - grown organically</option><option value="false">No - not organic</option></select></label>
      <label className={lab}>Quantity available<Input name="quantity_available" type="number" min="0.01" step="0.01" required defaultValue={listing.quantity_available} className="mt-2" /></label>
      <label className={lab}>Quantity unit<select name="unit" value={unit} onChange={(e) => setUnit(e.target.value)} required className={sel}>{options.map((x) => <option key={x}>{x}</option>)}</select></label>
      <label className={lab}>Price (ZAR)<Input name="asking_price" type="number" min="0" step="0.01" required defaultValue={listing.asking_price} className="mt-2" /></label>
      <label className={lab}>Price per<select name="price_unit" value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)} required className={sel}>{options.map((x) => <option key={x}>{x}</option>)}</select></label>
      <label className={lab}>{category === "Livestock" ? "Date of birth / production (optional)" : "Harvest / production date (optional)"}<Input name="harvest_date" type="date" defaultValue={listing.harvest_date ?? ""} className="mt-2" /></label>
      <label className={lab}>Available from<Input name="available_from" type="date" required defaultValue={listing.available_from} className="mt-2" /></label>
      <label className={lab}>Expiry / urgency date (optional)<Input name="expires_at" type="datetime-local" defaultValue={expiry} className="mt-2" /></label>
      <label className={lab}>Locality<Input name="locality" required defaultValue={listing.locality} className="mt-2" /></label>
      <label className={lab}>Municipality (optional)<Input name="municipality" defaultValue={listing.municipality ?? ""} className="mt-2" /></label>
      <label className={lab}>District<Input name="district" required defaultValue={listing.district ?? "Vhembe"} className="mt-2" /></label>
      <label className={lab}>Contact number for buyers<Input name="contact_phone" type="tel" required minLength={7} defaultValue={listing.contact_phone} className="mt-2" /></label>
      <label className={lab + " sm:col-span-2"}>Fulfilment details<Input name="fulfilment_details" required minLength={5} maxLength={500} defaultValue={listing.fulfilment_details} className="mt-2" /></label>
      <label className={lab + " sm:col-span-2"}>Optional notes<textarea name="quality_notes" maxLength={500} rows={3} defaultValue={listing.quality_notes ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm" /></label>
      <p className="text-xs leading-5 text-slate-500 sm:col-span-2">Your contact number and fulfilment details are shared with a buyer only when they submit an order request.</p>
      <Button type="submit" className="sm:col-span-2">Save changes</Button>
    </form>
  );
}
