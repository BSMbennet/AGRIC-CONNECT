"use client";
import { removeListing } from "@/actions/listings";

export function RemoveListingButton({ listingId, name }: { listingId: string; name: string }) {
  return (
    <form action={removeListing} onSubmit={(e) => { if (!window.confirm(`Remove “${name}”? If it already has orders it will be paused instead, so order history is kept.`)) e.preventDefault(); }}>
      <input type="hidden" name="listing_id" value={listingId} />
      <button type="submit" className="text-xs font-semibold text-red-700 underline" aria-label={"Remove " + name}>Remove</button>
    </form>
  );
}
