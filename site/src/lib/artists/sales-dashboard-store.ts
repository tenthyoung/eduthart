import { listIndexedArtworksByArtist } from "@/lib/artists/artwork-index";
import {
  summarizeSales,
  type ArtworkEngagement,
} from "@/lib/artists/sales-dashboard";
import { getArtworkSaveCount } from "@/lib/collectors/favorites";
import { listSales } from "@/lib/commerce/orders";

/**
 * Load the signed-in artist's sales dashboard.
 *
 * Kept apart from `sales-dashboard.ts` so the client page can import the types
 * and stage list without pulling the store (and `firebase-admin`) into the
 * browser bundle.
 */
export async function loadSalesDashboard(artistUid: string) {
  const [orders, listed] = await Promise.all([
    listSales(artistUid),
    listIndexedArtworksByArtist(artistUid),
  ]);

  const artworks: ArtworkEngagement[] = await Promise.all(
    listed.map(async (artwork) => ({
      href: artwork.href,
      imageUrl: artwork.imageUrl,
      key: artwork.key,
      saveCount: await getArtworkSaveCount(artwork.key),
      sold: artwork.availability === "sold",
      title: artwork.title,
    }))
  );

  return summarizeSales(orders, artworks);
}
