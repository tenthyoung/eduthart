import { cache } from "react";

import {
  listIndexedArtworks,
  type IndexedArtwork,
} from "@/lib/artists/artwork-index";
import { listAvailableArtworks } from "@/lib/artists/artwork-search";

/**
 * The homepage's one read of the artwork index.
 *
 * The hero and the sections below it stream separately, so each asks for the
 * index on its own; `cache` makes them share a single read per request, which
 * also keeps the featured piece and the grids describing the same inventory.
 */
export const getHomeIndex = cache(() => listIndexedArtworks());

export type TrendingArtist = {
  artistName: string;
  artistUid: string;
  artistUsername: string;
  coverUrl: string | null;
  count: number;
};

/**
 * The artists with the most originals for sale, newest work breaking ties.
 *
 * There is no follower ranking to lean on yet, so "trending" here means "has
 * the most you could buy today", which is honest and never empty while there
 * is stock.
 */
export function summarizeTrendingArtists(
  available: IndexedArtwork[],
  limit = 4
): TrendingArtist[] {
  const byArtist = new Map<string, TrendingArtist & { newest: string }>();

  for (const artwork of available) {
    if (!artwork.artistUid || !artwork.artistUsername) {
      continue;
    }

    const entry = byArtist.get(artwork.artistUid);

    if (entry) {
      entry.count += 1;
      if (artwork.updatedAt > entry.newest) {
        entry.newest = artwork.updatedAt;
        entry.coverUrl = artwork.imageUrl ?? entry.coverUrl;
      }
    } else {
      byArtist.set(artwork.artistUid, {
        artistName: artwork.artistName,
        artistUid: artwork.artistUid,
        artistUsername: artwork.artistUsername,
        count: 1,
        coverUrl: artwork.imageUrl,
        newest: artwork.updatedAt,
      });
    }
  }

  return [...byArtist.values()]
    .sort((a, b) => b.count - a.count || b.newest.localeCompare(a.newest))
    .slice(0, limit)
    .map(({ newest, ...artist }) => {
      void newest;
      return artist;
    });
}

/** Available originals, newest first, as the homepage shows them. */
export async function getHomeAvailable() {
  return listAvailableArtworks(await getHomeIndex());
}
