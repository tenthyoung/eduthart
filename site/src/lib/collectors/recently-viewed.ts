import { listIndexedArtworks, type IndexedArtwork } from "@/lib/artists/artwork-index";
import { buildArtworkKey, type ArtworkReference } from "@/lib/collectors/artwork-reference";
import {
  deleteUserDocument,
  listUserDocuments,
  saveUserDocument,
} from "@/lib/store/document-store";

const RECENTLY_VIEWED_COLLECTION = "recently_viewed";

/** Keeps the history useful without letting it grow without bound. */
const MAX_RECENTLY_VIEWED = 24;

export type RecentlyViewedArtwork = {
  artwork: IndexedArtwork | null;
  key: string;
  viewedAt: string;
};

export async function listRecentlyViewed(uid: string): Promise<RecentlyViewedArtwork[]> {
  const documents = await listUserDocuments(uid, RECENTLY_VIEWED_COLLECTION);
  const index = new Map((await listIndexedArtworks()).map((artwork) => [artwork.key, artwork]));

  return documents
    .map((document) => ({
      artwork: index.get(document.id) ?? null,
      key: document.id,
      viewedAt: typeof document.viewedAt === "string" ? document.viewedAt : "",
    }))
    .sort((first, second) => second.viewedAt.localeCompare(first.viewedAt));
}

export async function recordArtworkView(uid: string, reference: ArtworkReference) {
  const key = buildArtworkKey(reference);

  await saveUserDocument(uid, RECENTLY_VIEWED_COLLECTION, key, {
    artistUid: reference.artistUid,
    artistUsername: reference.artistUsername,
    itemId: reference.itemId,
    viewedAt: new Date().toISOString(),
  });

  const history = await listRecentlyViewed(uid);

  await Promise.all(
    history
      .slice(MAX_RECENTLY_VIEWED)
      .map((entry) => deleteUserDocument(uid, RECENTLY_VIEWED_COLLECTION, entry.key)),
  );

  return history.slice(0, MAX_RECENTLY_VIEWED);
}

export async function clearRecentlyViewed(uid: string) {
  const history = await listUserDocuments(uid, RECENTLY_VIEWED_COLLECTION);
  await Promise.all(
    history.map((entry) => deleteUserDocument(uid, RECENTLY_VIEWED_COLLECTION, entry.id)),
  );
}
