import {
  getPublicArtwork,
  toCartArtwork,
  type CartArtwork,
} from "@/lib/artists/public-artwork";
import { buildArtworkKey } from "@/lib/collectors/artwork-reference";
import {
  deleteUserCollection,
  deleteUserDocument,
  listUserDocuments,
  saveUserDocument,
} from "@/lib/store/document-store";

const CART_COLLECTION = "cart";

export type CartReference = {
  artistUid: string;
  artistUsername: string;
  itemId: string;
};

async function readReferences(uid: string): Promise<CartReference[]> {
  const documents = await listUserDocuments(uid, CART_COLLECTION);

  return documents.map((document) => ({
    artistUid: typeof document.artistUid === "string" ? document.artistUid : "",
    artistUsername:
      typeof document.artistUsername === "string"
        ? document.artistUsername
        : "",
    itemId: typeof document.itemId === "string" ? document.itemId : "",
  }));
}

/**
 * Read the cart with fresh listing data.
 *
 * Only the reference is stored, never the price, so an artwork that sold or
 * changed price since it was added cannot be checked out at the old terms.
 */
export async function readCart(uid: string): Promise<CartArtwork[]> {
  const references = await readReferences(uid);
  const records = await Promise.all(
    references.map((reference) =>
      getPublicArtwork(reference.artistUsername, reference.itemId)
    )
  );

  return records.filter((record) => record !== null).map(toCartArtwork);
}

export async function addToCart(uid: string, reference: CartReference) {
  await saveUserDocument(uid, CART_COLLECTION, reference.itemId, {
    addedAt: new Date().toISOString(),
    artistUid: reference.artistUid,
    artistUsername: reference.artistUsername,
    artworkKey: buildArtworkKey(reference),
    itemId: reference.itemId,
  });
}

export async function removeFromCart(uid: string, itemId: string) {
  await deleteUserDocument(uid, CART_COLLECTION, itemId);
}

export async function clearCart(uid: string) {
  await deleteUserCollection(uid, CART_COLLECTION);
}

export async function cartHasOtherArtist(uid: string, artistUid: string) {
  const references = await readReferences(uid);
  return references.some((reference) => reference.artistUid !== artistUid);
}
