import { listIndexedArtworks, type IndexedArtwork } from "@/lib/artists/artwork-index";
import { listFavorites } from "@/lib/collectors/favorites";
import { listFollowedArtists } from "@/lib/collectors/follows";

export type ArtworkRecommendation = {
  artwork: IndexedArtwork;
  reasons: string[];
  score: number;
};

/**
 * Weights for the signals a recommendation is built from.
 *
 * Favoriting an artist's work is the strongest signal a collector gives us, so
 * more of their catalogue outranks a loose tag overlap with a stranger.
 */
const WEIGHTS = {
  category: 2,
  followedArtist: 5,
  medium: 3,
  sameArtist: 6,
  style: 3,
  tag: 2,
};

const MAX_RECOMMENDATIONS = 12;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function collectAttributes(artworks: IndexedArtwork[]) {
  const categories = new Set<string>();
  const media = new Set<string>();
  const styles = new Set<string>();
  const tags = new Set<string>();

  for (const artwork of artworks) {
    if (artwork.category) categories.add(normalize(artwork.category));
    if (artwork.medium) media.add(normalize(artwork.medium));
    if (artwork.style) styles.add(normalize(artwork.style));
    artwork.tags.forEach((tag) => tags.add(normalize(tag)));
  }

  return { categories, media, styles, tags };
}

/**
 * Recommend available artwork from what a collector has already saved.
 *
 * Everything is derived from the favorites and follows the collector created
 * themselves; nothing is inferred from other people's behaviour.
 */
export async function buildRecommendations(uid: string): Promise<ArtworkRecommendation[]> {
  const [favorites, followed, index] = await Promise.all([
    listFavorites(uid),
    listFollowedArtists(uid),
    listIndexedArtworks(),
  ]);

  const savedArtworks = favorites
    .map((favorite) => favorite.artwork)
    .filter((artwork): artwork is IndexedArtwork => artwork !== null);

  if (savedArtworks.length === 0 && followed.length === 0) {
    return [];
  }

  const savedKeys = new Set(favorites.map((favorite) => favorite.key));
  const savedArtistUids = new Set(savedArtworks.map((artwork) => artwork.artistUid));
  const followedArtistUids = new Set(followed.map((artist) => artist.artistUid));
  const { categories, media, styles, tags } = collectAttributes(savedArtworks);

  const recommendations = index
    .filter(
      (artwork) =>
        artwork.availability === "original_available" &&
        !savedKeys.has(artwork.key) &&
        artwork.artistUid !== uid,
    )
    .map((artwork) => {
      const reasons: string[] = [];
      let score = 0;

      if (savedArtistUids.has(artwork.artistUid)) {
        score += WEIGHTS.sameArtist;
        reasons.push(`More from ${artwork.artistName}, whose work you saved`);
      }

      if (followedArtistUids.has(artwork.artistUid)) {
        score += WEIGHTS.followedArtist;
        reasons.push(`You follow ${artwork.artistName}`);
      }

      if (artwork.medium && media.has(normalize(artwork.medium))) {
        score += WEIGHTS.medium;
        reasons.push(`Also ${artwork.medium}`);
      }

      if (artwork.style && styles.has(normalize(artwork.style))) {
        score += WEIGHTS.style;
        reasons.push(`Matches the ${artwork.style} work you save`);
      }

      if (artwork.category && categories.has(normalize(artwork.category))) {
        score += WEIGHTS.category;
        reasons.push(`In ${artwork.category}`);
      }

      const sharedTags = artwork.tags.filter((tag) => tags.has(normalize(tag)));

      if (sharedTags.length > 0) {
        score += WEIGHTS.tag * sharedTags.length;
        reasons.push(`Tagged ${sharedTags.slice(0, 3).join(", ")}`);
      }

      return { artwork, reasons: reasons.slice(0, 3), score };
    })
    .filter((recommendation) => recommendation.score > 0);

  return recommendations
    .sort((first, second) =>
      second.score === first.score
        ? second.artwork.updatedAt.localeCompare(first.artwork.updatedAt)
        : second.score - first.score,
    )
    .slice(0, MAX_RECOMMENDATIONS);
}
