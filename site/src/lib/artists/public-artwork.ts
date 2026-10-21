import type {
  ListingItemDraft,
  ListingShippingAuthentication,
} from "@/lib/artists/listing-flow";
import {
  isPubliclyListed,
  loadListingStudio,
} from "@/lib/artists/listing-store";
import {
  buildProfileDisplayName,
  findAccountProfileByUsername,
  loadAccountProfile,
} from "@/lib/auth/profile-store";
import { normalizeCurrency } from "@/lib/commerce/money";

export type PublicArtworkRecord = {
  artistLocation: string | null;
  artistName: string;
  artistPhotoURL: string | null;
  artistUid: string;
  artistUsername: string;
  item: ListingItemDraft;
  /** The studio's shipping and authenticity settings, shared by every listing. */
  shipping: ListingShippingAuthentication | null;
};

export function buildArtworkHref(username: string, itemId: string) {
  return `/artists/${username}/art/${itemId}`;
}

export async function getPublicArtwork(
  username: string,
  itemId: string
): Promise<PublicArtworkRecord | null> {
  const profile = await findAccountProfileByUsername(username);

  if (!profile) {
    return null;
  }

  const studio = await loadListingStudio(profile.uid);
  const item =
    studio?.items.find((candidate) => candidate.id === itemId) ?? null;

  if (!item || !isPubliclyListed(item)) {
    return null;
  }

  return {
    artistLocation: profile.location ?? null,
    artistName: buildProfileDisplayName(profile),
    artistPhotoURL: profile.photoURL ?? null,
    artistUid: profile.uid,
    artistUsername: profile.username ?? username.trim().toLowerCase(),
    item,
    shipping: studio?.shared.shippingAuthentication ?? null,
  };
}

/** Look up a published artwork when only the seller's uid is known. */
export async function getPublicArtworkByUid(
  artistUid: string,
  itemId: string
): Promise<PublicArtworkRecord | null> {
  const profile = await loadAccountProfile(artistUid);

  if (!profile?.username) {
    return null;
  }

  const studio = await loadListingStudio(artistUid);
  const item =
    studio?.items.find((candidate) => candidate.id === itemId) ?? null;

  if (!item) {
    return null;
  }

  return {
    artistLocation: profile.location ?? null,
    artistName: buildProfileDisplayName(profile),
    artistPhotoURL: profile.photoURL ?? null,
    artistUid,
    artistUsername: profile.username,
    item,
    shipping: studio?.shared.shippingAuthentication ?? null,
  };
}

export function toCartArtwork(record: PublicArtworkRecord) {
  const { item } = record;

  return {
    artistName: record.artistName,
    artistUid: record.artistUid,
    artistUsername: record.artistUsername,
    availability: item.pricingInventory.availability,
    currency: normalizeCurrency(item.pricingInventory.currency),
    href: buildArtworkHref(record.artistUsername, item.id),
    imageUrl: item.media.mainImageUrl,
    itemId: item.id,
    price: item.pricingInventory.price,
    title: item.artworkDetails.title || "Untitled artwork",
  };
}

export type CartArtwork = ReturnType<typeof toCartArtwork>;
