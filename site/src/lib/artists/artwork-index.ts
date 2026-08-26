import type {
  ListingItemDraft,
  ListingStudioDraft,
} from "@/lib/artists/listing-flow";
import { isPubliclyListed } from "@/lib/artists/listing-store";
import { buildArtworkHref } from "@/lib/artists/public-artwork";
import { buildArtworkKey } from "@/lib/collectors/artwork-reference";
import { normalizeCurrency, toMinorUnits } from "@/lib/commerce/money";
import {
  deleteRootDocument,
  listRootDocuments,
  getRootDocument,
  saveRootDocument,
  type StoredDocument,
} from "@/lib/store/document-store";

/**
 * A flat index of every publicly listed artwork.
 *
 * Listings live inside each artist's studio document, so without this there is
 * no way to answer "what is for sale right now" without reading every artist.
 * Recommendations, comparison, and the price-drop notifications all read from
 * here, and the listing API keeps it in step whenever a studio is saved.
 */
const ARTWORK_INDEX_COLLECTION = "public_artworks";

export type IndexedArtwork = {
  artistName: string;
  artistUid: string;
  artistUsername: string;
  availability: string;
  category: string;
  currency: string;
  href: string;
  imageUrl: string | null;
  key: string;
  itemId: string;
  medium: string;
  priceMinor: number;
  style: string;
  subject: string;
  tags: string[];
  title: string;
  updatedAt: string;
};

function toIndexedArtwork(document: StoredDocument): IndexedArtwork {
  const read = (field: string) =>
    typeof document[field] === "string" ? (document[field] as string) : "";

  return {
    artistName: read("artistName"),
    artistUid: read("artistUid"),
    artistUsername: read("artistUsername"),
    availability: read("availability") || "original_available",
    category: read("category"),
    currency: normalizeCurrency(read("currency")),
    href: read("href"),
    imageUrl: typeof document.imageUrl === "string" ? document.imageUrl : null,
    itemId: read("itemId"),
    key: document.id,
    medium: read("medium"),
    priceMinor:
      typeof document.priceMinor === "number" ? document.priceMinor : 0,
    style: read("style"),
    subject: read("subject"),
    tags: Array.isArray(document.tags)
      ? document.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    title: read("title"),
    updatedAt: read("updatedAt"),
  };
}

function buildIndexEntry(
  item: ListingItemDraft,
  artist: { artistName: string; artistUid: string; artistUsername: string }
) {
  const currency = normalizeCurrency(item.pricingInventory.currency);

  return {
    artistName: artist.artistName,
    artistUid: artist.artistUid,
    artistUsername: artist.artistUsername,
    availability: item.pricingInventory.availability,
    category: item.artworkDetails.category,
    currency,
    href: buildArtworkHref(artist.artistUsername, item.id),
    imageUrl: item.media.mainImageUrl,
    itemId: item.id,
    medium: item.artworkDetails.medium,
    priceMinor: toMinorUnits(item.pricingInventory.price, currency),
    style: item.artworkDetails.style,
    subject: item.artworkDetails.subject,
    tags: item.artworkDetails.tags,
    title: item.artworkDetails.title || "Untitled artwork",
    updatedAt: item.updatedAt ?? new Date().toISOString(),
  };
}

export async function getIndexedArtwork(key: string) {
  const document = await getRootDocument(ARTWORK_INDEX_COLLECTION, key);
  return document ? toIndexedArtwork(document) : null;
}

export async function listIndexedArtworks(): Promise<IndexedArtwork[]> {
  const documents = await listRootDocuments(ARTWORK_INDEX_COLLECTION);
  return documents.map(toIndexedArtwork);
}

export async function listIndexedArtworksByArtist(
  artistUid: string
): Promise<IndexedArtwork[]> {
  const documents = await listRootDocuments(ARTWORK_INDEX_COLLECTION, [
    { field: "artistUid", value: artistUid },
  ]);
  return documents.map(toIndexedArtwork);
}

export type ArtworkIndexChange = {
  entry: IndexedArtwork;
  previousPriceMinor: number | null;
  type: "listed" | "price_drop" | "updated";
};

/**
 * Rewrite an artist's slice of the index and report what changed.
 *
 * The returned changes drive the follower notifications, so a first listing and
 * a price reduction are distinguished here rather than re-derived by the caller.
 */
export async function syncArtworkIndex(
  artist: { artistName: string; artistUid: string; artistUsername: string },
  studio: ListingStudioDraft
): Promise<ArtworkIndexChange[]> {
  const existing = await listIndexedArtworksByArtist(artist.artistUid);
  const existingByKey = new Map(existing.map((entry) => [entry.key, entry]));
  const published = studio.items.filter(isPubliclyListed);
  const changes: ArtworkIndexChange[] = [];

  for (const item of published) {
    const key = buildArtworkKey({
      artistUid: artist.artistUid,
      itemId: item.id,
    });
    const previous = existingByKey.get(key) ?? null;
    const data = buildIndexEntry(item, artist);
    const saved = toIndexedArtwork(
      await saveRootDocument(ARTWORK_INDEX_COLLECTION, key, data)
    );

    if (!previous) {
      changes.push({ entry: saved, previousPriceMinor: null, type: "listed" });
    } else if (
      saved.priceMinor > 0 &&
      previous.priceMinor > 0 &&
      saved.priceMinor < previous.priceMinor
    ) {
      changes.push({
        entry: saved,
        previousPriceMinor: previous.priceMinor,
        type: "price_drop",
      });
    } else {
      changes.push({
        entry: saved,
        previousPriceMinor: previous.priceMinor,
        type: "updated",
      });
    }

    existingByKey.delete(key);
  }

  // Anything left was unpublished, deleted, or made private.
  await Promise.all(
    Array.from(existingByKey.keys()).map((key) =>
      deleteRootDocument(ARTWORK_INDEX_COLLECTION, key)
    )
  );

  return changes;
}

export async function setIndexedArtworkAvailability(
  key: string,
  availability: string
) {
  const existing = await getRootDocument(ARTWORK_INDEX_COLLECTION, key);

  if (!existing) {
    return null;
  }

  return toIndexedArtwork(
    await saveRootDocument(ARTWORK_INDEX_COLLECTION, key, {
      availability,
      updatedAt: new Date().toISOString(),
    })
  );
}
