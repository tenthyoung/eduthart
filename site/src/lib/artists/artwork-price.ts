import type { IndexedArtwork } from "@/lib/artists/artwork-index";
import { formatMinorUnits } from "@/lib/commerce/money";

/**
 * An artwork's price as a card or caption shows it. Plain (not client) code,
 * so server-rendered captions and the client artwork card share it.
 */
export function formatArtworkPrice(
  artwork: Pick<IndexedArtwork, "currency" | "priceMinor">
) {
  // Artwork is priced in whole amounts, so "$820" reads better than "$820.00";
  // a price that really has cents keeps them.
  return artwork.priceMinor > 0
    ? formatMinorUnits(artwork.priceMinor, artwork.currency).replace(
        /\.00$/,
        ""
      )
    : "Price on request";
}
