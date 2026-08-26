import {
  normalizeListingStudio,
  type ListingItemDraft,
  type ListingStudioDraft,
} from "@/lib/artists/listing-flow";
import { getE2EListingFlow, isE2EAuthEnabled } from "@/lib/auth/e2e-store";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

/** Read an artist's listing studio from whichever backend is active. */
export async function loadListingStudio(uid: string): Promise<ListingStudioDraft | null> {
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

export async function listPublishedArtworks(uid: string): Promise<ListingItemDraft[]> {
  const studio = await loadListingStudio(uid);
  return studio ? studio.items.filter(isPubliclyListed) : [];
}
