"use client";

import { useMemo, useState } from "react";
import { createAggregateOrder } from "@/actions/aggregation";
import { Button } from "@/components/ui/button";

type Listing = {
  id: string;
  farmer_id: string;
  produce_name: string;
  quantity_available: number;
  reserved_quantity: number;
  quantity_sold: number;
  unit: string;
  asking_price: number;
  locality: string;
};

export function AggregateForm({ listings }: { listings: Listing[] }) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const allocations = useMemo(() => listings.flatMap((listing) => {
    const quantity = Number(quantities[listing.id] || 0);
    return quantity > 0 ? [{ listing_id: listing.id, quantity }] : [];
  }), [listings, quantities]);
  const farmerCount = new Set(allocations.map((allocation) => listings.find((item) => item.id === allocation.listing_id)?.farmer_id)).size;
  return (
    <form action={createAggregateOrder} className="mt-6 space-y-4">
      <input type="hidden" name="allocations" value={JSON.stringify(allocations)} />
      {listings.map((listing) => {
        const available = Number(listing.quantity_available) - Number(listing.reserved_quantity) - Number(listing.quantity_sold);
        return <label key={listing.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-900/10 bg-white p-4">
          <span><span className="block font-bold text-forest">{listing.produce_name}</span><span className="mt-1 block text-xs text-slate-500">{listing.locality} · {available} {listing.unit} available · R{Number(listing.asking_price).toFixed(2)}/{listing.unit}</span></span>
          <span className="w-32"><span className="mb-1 block text-xs font-semibold text-slate-500">Allocate ({listing.unit})</span><input type="number" min="0" max={available} step="0.01" value={quantities[listing.id] || ""} onChange={(event) => setQuantities((current) => ({ ...current, [listing.id]: event.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></span>
        </label>;
      })}
      <p className="text-xs text-slate-500">Select stock from at least two different farmers. Each farmer’s quantity and price is preserved in the order allocation.</p>
      <Button type="submit" disabled={allocations.length < 2 || farmerCount < 2} className="w-full">Create combined order ({allocations.length} listings)</Button>
    </form>
  );
}
