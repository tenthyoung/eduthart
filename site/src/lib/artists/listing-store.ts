import {
  normalizeListingStudio,
  type ListingItemDraft,
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
  return item.salesVisibility.public && !item.salesVisibility.draft;
}

export async function listPublishedArtworks(
  uid: string
): Promise<ListingItemDraft[]> {
  const studio = await loadListingStudio(uid);
  return studio ? studio.items.filter(isPubliclyListed) : [];
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

  if (isE2EAuthEnabled()) {
    await updateE2EListingFlow(artistUid, studio);
    return item;
  }

  await getFirebaseAdminDb()
    .collection("users")
    .doc(artistUid)
    .collection("seller")
    .doc("listing_flow")
    .set(studio, { merge: false });

  return item;
}
