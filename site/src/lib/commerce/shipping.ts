import type {
  ListingItemDraft,
  ListingSharedSettings,
} from "@/lib/artists/listing-flow";
import { toMinorUnits } from "@/lib/commerce/money";

/**
 * Shipping cost for a listing.
 *
 * Live rates come from Shippo in the plan recorded in docs/marketplace-commerce.md.
 * Until that integration exists, the artist's own stated domestic shipping
 * charge is used, because it is the number they already agreed to honour when
 * they published the listing.
 */
export const DEFAULT_SHIPPING_AMOUNT = 45;

export function resolveShippingAmountMinor(
  item: ListingItemDraft,
  shared: ListingSharedSettings,
  currency: string
) {
  if (item.salesVisibility.digitalDownload) {
    return 0;
  }

  const { freeShipping, domesticShipping } = shared.shippingAuthentication;

  if (freeShipping) {
    return 0;
  }

  const stated = Number(domesticShipping);

  if (
    Number.isFinite(stated) &&
    stated >= 0 &&
    domesticShipping.trim() !== ""
  ) {
    return toMinorUnits(stated, currency);
  }

  return toMinorUnits(DEFAULT_SHIPPING_AMOUNT, currency);
}
