import { getIndexedArtwork, listIndexedArtworks, type IndexedArtwork } from "@/lib/artists/artwork-index";
import { buildArtworkKey, type ArtworkReference } from "@/lib/collectors/artwork-reference";
import {
  deleteRootDocument,
  deleteUserDocument,
  getRootDocument,
  getUserDocument,
  listRootDocuments,
  listUserDocuments,
  saveRootDocument,
  saveUserDocument,
} from "@/lib/store/document-store";
import { isE2EAuthEnabled } from "@/lib/auth/e2e-store";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const FAVORITES_COLLECTION = "favorites";
const FAVORITE_STATS_COLLECTION = "artwork_stats";
const FAVORITE_OWNERS_COLLECTION = "artwork_favorites";

export type FavoriteRecord = {
  artistUid: string;
  artistUsername: string;
  artwork: IndexedArtwork | null;
  itemId: string;
  key: string;
  savedAt: string;
};

async function readFavorite(uid: string, key: string) {
  return getUserDocument(uid, FAVORITES_COLLECTION, key);
}

/**
 * Adjust the aggregate save count for an artwork.
 *
 * Firestore's atomic increment keeps concurrent saves correct; callers only
 * ever call this after confirming the favorite state actually changed, which
 * is what makes a repeated save idempotent.
 */
async function adjustSaveCount(key: string, delta: number) {
  if (isE2EAuthEnabled()) {
    const existing = await getRootDocument(FAVORITE_STATS_COLLECTION, key);
    const current = typeof existing?.saveCount === "number" ? existing.saveCount : 0;
    await saveRootDocument(FAVORITE_STATS_COLLECTION, key, {
      saveCount: Math.max(0, current + delta),
    });
    return;
  }

  await getFirebaseAdminDb()
    .collection(FAVORITE_STATS_COLLECTION)
    .doc(key)
    .set({ saveCount: FieldValue.increment(delta) }, { merge: true });
}

export async function getArtworkSaveCount(key: string) {
  const stats = await getRootDocument(FAVORITE_STATS_COLLECTION, key);
  const saveCount = typeof stats?.saveCount === "number" ? stats.saveCount : 0;
  return Math.max(0, saveCount);
}

export async function listFavorites(uid: string): Promise<FavoriteRecord[]> {
  const documents = await listUserDocuments(uid, FAVORITES_COLLECTION);
  const index = new Map((await listIndexedArtworks()).map((artwork) => [artwork.key, artwork]));

  return documents
    .map((document) => ({
      artistUid: typeof document.artistUid === "string" ? document.artistUid : "",
      artistUsername: typeof document.artistUsername === "string" ? document.artistUsername : "",
      artwork: index.get(document.id) ?? null,
      itemId: typeof document.itemId === "string" ? document.itemId : "",
      key: document.id,
      savedAt: typeof document.savedAt === "string" ? document.savedAt : "",
    }))
    .sort((first, second) => second.savedAt.localeCompare(first.savedAt));
}

export async function isFavorite(uid: string, reference: ArtworkReference) {
  return (await readFavorite(uid, buildArtworkKey(reference))) !== null;
}

export async function addFavorite(uid: string, reference: ArtworkReference) {
  const key = buildArtworkKey(reference);

  if (await readFavorite(uid, key)) {
    return { added: false, key };
  }

  await saveUserDocument(uid, FAVORITES_COLLECTION, key, {
    artistUid: reference.artistUid,
    artistUsername: reference.artistUsername,
    itemId: reference.itemId,
    savedAt: new Date().toISOString(),
  });

  // The reverse lookup answers "who saved this piece" when it sells.
  await saveRootDocument(FAVORITE_OWNERS_COLLECTION, `${key}__${uid}`, {
    artworkKey: key,
    collectorUid: uid,
  });
  await adjustSaveCount(key, 1);

  return { added: true, key };
}

export async function removeFavorite(uid: string, reference: ArtworkReference) {
  const key = buildArtworkKey(reference);

  if (!(await readFavorite(uid, key))) {
    return { key, removed: false };
  }

  await deleteUserDocument(uid, FAVORITES_COLLECTION, key);
  await deleteRootDocument(FAVORITE_OWNERS_COLLECTION, `${key}__${uid}`);
  await adjustSaveCount(key, -1);

  return { key, removed: true };
}

export async function listCollectorsWhoSaved(key: string) {
  const documents = await listRootDocuments(FAVORITE_OWNERS_COLLECTION, [
    { field: "artworkKey", value: key },
  ]);

  return documents
    .map((document) => (typeof document.collectorUid === "string" ? document.collectorUid : null))
    .filter((collectorUid): collectorUid is string => collectorUid !== null);
}

export async function getFavoriteArtwork(key: string) {
  return getIndexedArtwork(key);
}
