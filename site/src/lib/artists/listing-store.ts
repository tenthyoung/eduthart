import {
  isTakenDown,
  normalizeListingStudio,
  type ListingItemDraft,
  type ListingModeration,
  type ListingStudioDraft,
} from "@/lib/artists/listing-flow";
import {
  getE2EListingFlow,
  isE2EAuthEnabled,
  updateE2EListingFlow,
} from "@/lib/auth/e2e-store";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

/** Read an artist's listing studio from whichever backend is active. */
export async function loadListingStudio(
  uid: string
): Promise<ListingStudioDraft | null> {
  if (isE2EAuthEnabled()) {
    const studio = await getE2EListingFlow(uid);
    return studio ? normalizeListingStudio(studio) : null;
  }

  const snapshot = await getFirebaseAdminDb()
    .collection("users")
    .doc(uid)
    .collection("seller")
    .doc("listing_flow")
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return normalizeListingStudio(snapshot.data() as ListingStudioDraft);
}

export function isPubliclyListed(item: ListingItemDraft) {
  return (
    item.salesVisibility.public &&
    !item.salesVisibility.draft &&
    !isTakenDown(item)
  );
}

export async function listPublishedArtworks(
  uid: string
): Promise<ListingItemDraft[]> {
  const studio = await loadListingStudio(uid);
  return studio ? studio.items.filter(isPubliclyListed) : [];
}

/**
 * Write a studio back as the server, bypassing the listing API's ownership
 * guard. Checkout fulfilment and the moderation console both run as someone
 * other than the artist, so they have to reach the seller document this way.
 */
async function saveListingStudio(
  artistUid: string,
  studio: ListingStudioDraft
) {
  if (isE2EAuthEnabled()) {
    await updateE2EListingFlow(artistUid, studio);
    return;
  }

  await getFirebaseAdminDb()
    .collection("users")
    .doc(artistUid)
    .collection("seller")
    .doc("listing_flow")
    .set(studio, { merge: false });
}

/**
 * Update one listing's availability inside an artist's studio.
 *
 * Checkout fulfilment runs as the buyer, so it has to reach into the seller's
 * studio document through the admin SDK rather than the listing API.
 */
export async function setListingAvailability(
  artistUid: string,
  itemId: string,
  availability: ListingItemDraft["pricingInventory"]["availability"]
) {
  const studio = await loadListingStudio(artistUid);
  const item = studio?.items.find((candidate) => candidate.id === itemId);

  if (!studio || !item) {
    return null;
  }

  if (item.pricingInventory.availability === availability) {
    return item;
  }

  item.pricingInventory.availability = availability;
  item.updatedAt = new Date().toISOString();
  studio.updatedAt = item.updatedAt;

  await saveListingStudio(artistUid, studio);

  return item;
}

/**
 * Record or clear an admin's moderation decision on one listing.
 *
 * Returns the whole studio so the caller can re-sync the public index from
 * it without a second read: a hidden piece has to leave browse at once.
 */
export async function setListingModeration(
  artistUid: string,
  itemId: string,
  moderation: ListingModeration | null
): Promise<ListingStudioDraft | null> {
  const studio = await loadListingStudio(artistUid);
  const item = studio?.items.find((candidate) => candidate.id === itemId);

  if (!studio || !item) {
    return null;
  }

  item.moderation = moderation;
  item.updatedAt = new Date().toISOString();
  studio.updatedAt = item.updatedAt;

  await saveListingStudio(artistUid, studio);

  return studio;
}
