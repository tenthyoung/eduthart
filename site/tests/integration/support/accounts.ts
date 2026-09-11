import { expect } from "vitest";

import { POST as seedAccountRoute } from "@/app/api/test/e2e-auth/route";
import { POST as seedListingRoute } from "@/app/api/test/e2e-listing/route";
import { POST as addressesRoute } from "@/app/api/collectors/addresses/route";
import { POST as cartRoute } from "@/app/api/cart/route";
import { POST as checkoutRoute } from "@/app/api/commerce/checkout/route";
import { POST as confirmRoute } from "@/app/api/commerce/confirm/route";
import { POST as favoritesRoute } from "@/app/api/collectors/favorites/route";
import { POST as followsRoute } from "@/app/api/collectors/follows/route";
import { GET as notificationsRoute } from "@/app/api/notifications/route";
import type { SavedAddress } from "@/lib/collectors/addresses";
import type { Order } from "@/lib/commerce/orders";
import type { UserNotification } from "@/lib/notifications/types";

import { callRouteOk } from "./routes";

/**
 * Seeding helpers mirroring tests/support/accounts.ts.
 *
 * The browser suite seeds through the same two test routes over HTTP; these
 * call them in-process so a test can set up an artist, a collector, and a sale
 * in milliseconds instead of a page load each.
 */

export type TestAccountOptions = {
  authProviders?: string[];
  displayName?: string;
  email?: string;
  uid: string;
  username?: string | null;
};

export type TestAccount = {
  displayName: string;
  email: string;
  uid: string;
  username: string | null;
};

export async function createAccount(
  options: TestAccountOptions
): Promise<TestAccount> {
  const displayName = options.displayName ?? "Jordan Collector";
  const [firstName, ...rest] = displayName.trim().split(/\s+/);
  const email = options.email ?? `${options.uid}@example.com`;

  await callRouteOk(seedAccountRoute, {
    body: {
      authProviders: options.authProviders ?? ["password"],
      displayName,
      email,
      firstName: firstName ?? "Jordan",
      lastName: rest.join(" ") || "Collector",
      uid: options.uid,
      username: options.username ?? null,
    },
    path: "/api/test/e2e-auth",
  });

  return {
    displayName,
    email,
    uid: options.uid,
    username: options.username ?? null,
  };
}

export type PublishedArtwork = {
  href: string;
  itemId: string;
  username: string;
};

export async function publishArtwork(options: {
  category?: string;
  itemId?: string;
  medium?: string;
  price?: string;
  style?: string;
  subject?: string;
  tags?: string[];
  title?: string;
  uid: string;
}): Promise<PublishedArtwork> {
  return callRouteOk<PublishedArtwork>(seedListingRoute, {
    body: options,
    path: "/api/test/e2e-listing",
  });
}

/** An artist with a username and one published original, ready to act on. */
export async function seedGallery(suffix: string) {
  const artist = await createAccount({
    displayName: "Marina Vale",
    uid: `artist-${suffix}`,
    username: `marina-${suffix}`,
  });
  const artwork = await publishArtwork({ uid: artist.uid });

  return { artist, artwork };
}

export async function addAddress(
  uid: string,
  address: {
    city: string;
    country?: string;
    kind?: "billing" | "shipping";
    line1: string;
    name: string;
    postalCode: string;
    region?: string;
  }
) {
  const { addresses } = await callRouteOk<{ addresses: SavedAddress[] }>(
    addressesRoute,
    {
      as: uid,
      body: { country: "US", kind: "shipping", ...address },
      path: "/api/collectors/addresses",
    }
  );

  return addresses;
}

export async function saveFavorite(uid: string, artwork: PublishedArtwork) {
  await callRouteOk(favoritesRoute, {
    as: uid,
    body: { itemId: artwork.itemId, username: artwork.username },
    path: "/api/collectors/favorites",
  });
}

export async function followArtist(uid: string, username: string) {
  await callRouteOk(followsRoute, {
    as: uid,
    body: { username },
    path: "/api/collectors/follows",
  });
}

export async function addToCart(uid: string, artwork: PublishedArtwork) {
  await callRouteOk(cartRoute, {
    as: uid,
    body: { itemId: artwork.itemId, username: artwork.username },
    path: "/api/cart",
  });
}

/**
 * Take a collector from a full cart to a paid order.
 *
 * This is the same two calls the checkout page makes; the card charge is the
 * E2E stand-in, so the order, reservation, fulfilment, and notification paths
 * are the production ones.
 */
export async function checkout(
  uid: string,
  options: { billingAddressId?: string; billingSameAsShipping?: boolean } = {}
): Promise<Order> {
  const { url } = await callRouteOk<{ orderId: string; url: string }>(
    checkoutRoute,
    { as: uid, body: options, path: "/api/commerce/checkout" }
  );

  const sessionId = new URL(url, "http://127.0.0.1:3005").searchParams.get(
    "session_id"
  );
  expect(sessionId).toBeTruthy();

  const { order } = await callRouteOk<{ order: Order }>(confirmRoute, {
    as: uid,
    body: { sessionId },
    path: "/api/commerce/confirm",
  });

  return order;
}

export async function listNotifications(
  uid: string
): Promise<UserNotification[]> {
  const { notifications } = await callRouteOk<{
    notifications: UserNotification[];
  }>(notificationsRoute, { as: uid, path: "/api/notifications" });

  return notifications;
}

/** The one notification of a kind, asserting there is exactly one. */
export async function findNotification(uid: string, kind: string) {
  const matches = (await listNotifications(uid)).filter(
    (notification) => notification.kind === kind
  );

  expect(matches).toHaveLength(1);
  return matches[0];
}
