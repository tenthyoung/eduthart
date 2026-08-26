import { NextResponse } from "next/server";

import { syncArtworkIndex } from "@/lib/artists/artwork-index";
import { notifyFollowersOfListingChanges } from "@/lib/artists/listing-notifications";
import {
  createEmptyListingItem,
  createEmptyListingStudio,
} from "@/lib/artists/listing-flow";
import {
  buildProfileDisplayName,
  loadAccountProfile,
} from "@/lib/auth/profile-store";
import { isE2EAuthEnabled, updateE2EListingFlow } from "@/lib/auth/e2e-store";

type SeedListingBody = {
  currency?: string;
  /** Reuse an existing listing id to edit that artwork rather than add one. */
  itemId?: string;
  medium?: string;
  price?: string;
  style?: string;
  tags?: string[];
  title?: string;
  uid?: string;
};

/**
 * Publish an artwork for the end-to-end suite.
 *
 * Listings are normally created through the multi-step studio UI, which is far
 * too slow to drive for every collector test. This writes the same studio
 * document the UI would and runs the same index sync, so what the tests browse
 * is what a real listing produces.
 */
export async function POST(request: Request) {
  if (!isE2EAuthEnabled()) {
    return NextResponse.json(
      { error: { code: "not-found", message: "Not found." } },
      { status: 404 }
    );
  }

  const body = (await request.json()) as SeedListingBody;

  if (!body.uid?.trim()) {
    return NextResponse.json(
      { error: { code: "invalid-argument", message: "A uid is required." } },
      { status: 400 }
    );
  }

  const profile = await loadAccountProfile(body.uid);

  if (!profile?.username) {
    return NextResponse.json(
      {
        error: {
          code: "not-found",
          message: "Seed the artist profile with a username first.",
        },
      },
      { status: 404 }
    );
  }

  const item = createEmptyListingItem(
    body.itemId ? { id: body.itemId } : undefined
  );
  item.artworkDetails.title = body.title ?? "Harbour Light";
  item.artworkDetails.medium = body.medium ?? "Oil on canvas";
  item.artworkDetails.style = body.style ?? "Contemporary";
  item.artworkDetails.category = "Painting";
  item.artworkDetails.description =
    "A study of morning light across the water.";
  item.artworkDetails.tags = body.tags ?? ["coastal", "light"];
  item.artworkDetails.yearCreated = "2026";
  item.dimensions.width = "24";
  item.dimensions.height = "36";
  item.media.mainImageUrl = "https://example.com/artwork.jpg";
  item.pricingInventory.availability = "original_available";
  item.pricingInventory.currency = body.currency ?? "USD";
  item.pricingInventory.price = body.price ?? "2400";
  item.salesVisibility.public = true;
  item.salesVisibility.draft = false;
  item.updatedAt = new Date().toISOString();

  const studio = createEmptyListingStudio();
  studio.items = [item];
  studio.shared.shippingAuthentication.domesticShipping = "50";
  studio.updatedAt = item.updatedAt;

  const artistName = buildProfileDisplayName(profile);

  await updateE2EListingFlow(body.uid, studio);
  // Mirror what saving a studio through the listing API does, so tests exercise
  // the real index sync and follower alerts rather than a shortcut.
  const changes = await syncArtworkIndex(
    { artistName, artistUid: body.uid, artistUsername: profile.username },
    studio
  );
  await notifyFollowersOfListingChanges(body.uid, artistName, changes);

  return NextResponse.json({
    href: `/artists/${profile.username}/art/${item.id}`,
    itemId: item.id,
    username: profile.username,
  });
}
