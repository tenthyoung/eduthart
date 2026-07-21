import { normalizeListingStudio, type ListingItemDraft, type ListingStudioDraft } from "@/lib/artists/listing-flow";
import { findE2EAccountProfileByUsername, getE2EListingFlow, isE2EAuthEnabled } from "@/lib/auth/e2e-store";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

export type PublicArtworkRecord = {
  artistName: string;
  artistUid: string;
  artistUsername: string;
  item: ListingItemDraft;
};

export async function getPublicArtwork(username: string, itemId: string): Promise<PublicArtworkRecord | null> {
  const normalizedUsername = username.trim().toLowerCase();

  if (isE2EAuthEnabled()) {
    const profile = await findE2EAccountProfileByUsername(normalizedUsername);
    if (!profile) return null;
    const studio = await getE2EListingFlow(profile.uid);
    const item = studio ? normalizeListingStudio(studio).items.find((candidate) => candidate.id === itemId) : null;
    if (!item?.salesVisibility.public || item.salesVisibility.draft) return null;
    return {
      artistName: profile.displayName || [profile.firstName, profile.lastName].filter(Boolean).join(" ") || `@${profile.username}`,
      artistUid: profile.uid,
      artistUsername: profile.username ?? normalizedUsername,
      item,
    };
  }

  const db = getFirebaseAdminDb();
  const profileSnapshot = await db.collection("users").where("usernameLower", "==", normalizedUsername).limit(1).get();
  const profileDocument = profileSnapshot.docs[0];
  if (!profileDocument) return null;
  const studioSnapshot = await profileDocument.ref.collection("seller").doc("listing_flow").get();
  if (!studioSnapshot.exists) return null;
  const item = normalizeListingStudio(studioSnapshot.data() as ListingStudioDraft).items.find((candidate) => candidate.id === itemId);
  if (!item?.salesVisibility.public || item.salesVisibility.draft) return null;
  const profile = profileDocument.data() as Record<string, unknown>;
  const fullName = [profile.firstName, profile.lastName].filter((value) => typeof value === "string" && value).join(" ");
  return {
    artistName: (typeof profile.displayName === "string" && profile.displayName) || fullName || `@${normalizedUsername}`,
    artistUid: profileDocument.id,
    artistUsername: normalizedUsername,
    item,
  };
}

export function toCartArtwork(record: PublicArtworkRecord) {
  const { item } = record;
  return {
    artistName: record.artistName,
    artistUsername: record.artistUsername,
    availability: item.pricingInventory.availability,
    currency: item.pricingInventory.currency || "USD",
    imageUrl: item.media.mainImageUrl,
    itemId: item.id,
    price: item.pricingInventory.price,
    title: item.artworkDetails.title || "Untitled artwork",
  };
}
