import type { MetadataRoute } from "next";

import { listIndexedArtworks } from "@/lib/artists/artwork-index";
import { SITE_URL } from "@/lib/site-url";

// Artworks change as artists publish; rebuild the map hourly.
export const revalidate = 3600;

const STATIC_PATHS = [
  "/",
  "/browse",
  "/about",
  "/contact",
  "/for-artists",
  "/apply-to-be-an-artist",
  "/legal",
  "/legal/privacy-policy",
  "/legal/terms-of-service",
  "/legal/refund-cancellation-policy",
  "/legal/content-policy",
  "/legal/accessibility",
  "/legal/dmca",
  "/legal/trademark-notice",
];

function toDate(value: string | undefined) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : undefined;
}

/**
 * A source that is down or unconfigured (no Firebase credentials in CI, say)
 * must not break the build or empty the whole sitemap, so each dynamic source
 * degrades to nothing on its own.
 */
async function safely<T>(load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const artworks = await safely(listIndexedArtworks);

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
  }));

  // An artist page is public once the artist has at least one published work.
  const artistLastUpdate = new Map<string, string>();

  for (const artwork of artworks) {
    if (!artwork.href || !artwork.artistUsername) continue;

    entries.push({
      url: `${SITE_URL}${artwork.href}`,
      lastModified: toDate(artwork.updatedAt),
    });

    const seen = artistLastUpdate.get(artwork.artistUsername) ?? "";
    if (artwork.updatedAt > seen) {
      artistLastUpdate.set(artwork.artistUsername, artwork.updatedAt);
    }
  }

  for (const [username, updatedAt] of artistLastUpdate) {
    entries.push({
      url: `${SITE_URL}/artists/${username}`,
      lastModified: toDate(updatedAt),
    });
  }

  return entries;
}
