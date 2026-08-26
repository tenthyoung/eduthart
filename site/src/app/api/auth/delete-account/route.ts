import { NextResponse } from "next/server";

import {
  deleteE2EAccountProfile,
  isE2EAuthEnabled,
} from "@/lib/auth/e2e-store";
import { getAuthenticatedSession } from "@/lib/auth/server-session";
import { deleteAllCollections } from "@/lib/collectors/collections";
import { listFavorites, removeFavorite } from "@/lib/collectors/favorites";
import { removeAllFollowsForUser } from "@/lib/collectors/follows";
import { clearRecentlyViewed } from "@/lib/collectors/recently-viewed";
import { clearCart } from "@/lib/commerce/cart";
import { forgetStripeCustomer } from "@/lib/commerce/payment-methods";
import { isStripeConfigured } from "@/lib/commerce/stripe";
import { deleteAllNotifications } from "@/lib/notifications/store";
import { deleteUserCollection } from "@/lib/store/document-store";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";

/**
 * Remove the data this account owns.
 *
 * Favorites and follows go through their own helpers rather than a bulk delete
 * because both maintain reverse lookups and aggregate counts that would
 * otherwise be left pointing at a user who no longer exists. Orders are kept:
 * they are the other party's financial record as much as this one's.
 */
async function deleteCollectorData(uid: string) {
  const favorites = await listFavorites(uid);

  await Promise.allSettled([
    ...favorites.map((favorite) =>
      removeFavorite(uid, {
        artistUid: favorite.artistUid,
        artistUsername: favorite.artistUsername,
        itemId: favorite.itemId,
      })
    ),
    removeAllFollowsForUser(uid),
    deleteAllCollections(uid),
    clearRecentlyViewed(uid),
    clearCart(uid),
    deleteAllNotifications(uid),
    deleteUserCollection(uid, "addresses"),
  ]);
}

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedSession(request);

    await deleteCollectorData(session.uid);

    if (session.authType === "e2e" || isE2EAuthEnabled()) {
      await deleteE2EAccountProfile(session.uid);
      return NextResponse.json({ success: true });
    }

    if (isStripeConfigured()) {
      await forgetStripeCustomer(session.uid).catch(() => undefined);
    }

    await Promise.allSettled([
      deleteUserCollection(session.uid, "settings"),
      deleteUserCollection(session.uid, "decks"),
    ]);

    const db = getFirebaseAdminDb();
    await db
      .collection("users")
      .doc(session.uid)
      .delete()
      .catch(() => undefined);

    await getFirebaseAdminAuth().deleteUser(session.uid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: {
          code: "internal",
          message: "Unable to delete your account right now.",
        },
      },
      { status: 500 }
    );
  }
}
