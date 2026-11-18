/**
 * Single source of truth for "may this viewer see an Add to Cart action on this listing?".
 * Hidden (not disabled) when the signed-in viewer owns the listing.
 * Signed-out viewers keep the existing behaviour (they are asked to sign in at checkout).
 * The server actions and a database trigger enforce the same rule independently.
 */
export function canShowAddToCart(opts: { viewerId: string | null; listingFarmerId: string | null | undefined; available: boolean }): boolean {
  if (!opts.available) return false;
  if (opts.viewerId && opts.listingFarmerId && opts.viewerId === opts.listingFarmerId) return false;
  return true;
}
