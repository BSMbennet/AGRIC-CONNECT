"use client";
import { removeListing } from "@/actions/listings";

export function RemoveListingButton({ listingId, confirmText, label, ariaLabel }: { listingId: string; name?: string; confirmText: string; label: string; ariaLabel: string }) {
  return (
    <form action={removeListing} onSubmit={(e) => { if (!window.confirm(confirmText)) e.preventDefault(); }}>
      <input type="hidden" name="listing_id" value={listingId} />
      <button type="submit" className="text-xs font-semibold text-red-700 underline" aria-label={ariaLabel}>{label}</button>
    </form>
  );
}
