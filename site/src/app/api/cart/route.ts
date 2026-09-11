import { NextResponse } from "next/server";

import { apiError, withSession } from "@/lib/api/handler";
import { getPublicArtwork } from "@/lib/artists/public-artwork";
import {
  addToCart,
  cartHasOtherArtist,
  readCart,
  removeFromCart,
} from "@/lib/commerce/cart";

export function GET(request: Request) {
  return withSession(request, async (session) =>
    NextResponse.json({ items: await readCart(session.uid) })
  );
}

export function POST(request: Request) {
  return withSession(request, async (session) => {
    const body = (await request.json()) as {
      itemId?: string;
      username?: string;
    };

    if (!body.itemId || !body.username) {
      return apiError("Artwork is required.", 400);
    }

    const artwork = await getPublicArtwork(body.username, body.itemId);

    if (
      !artwork ||
      artwork.item.pricingInventory.availability !== "original_available"
    ) {
      return apiError("This artwork is not available.", 409, "conflict");
    }

    if (await cartHasOtherArtist(session.uid, artwork.artistUid)) {
      return apiError(
        "Checkout supports one artist at a time. Remove the other artist’s work first.",
        409,
        "conflict"
      );
    }

    await addToCart(session.uid, {
      artistUid: artwork.artistUid,
      artistUsername: artwork.artistUsername,
      itemId: artwork.item.id,
    });

    return NextResponse.json({ items: await readCart(session.uid) });
  });
}

export function DELETE(request: Request) {
  return withSession(request, async (session) => {
    const body = (await request.json()) as { itemId?: string };

    if (!body.itemId) {
      return apiError("Artwork is required.", 400);
    }

    await removeFromCart(session.uid, body.itemId);
    return NextResponse.json({ items: await readCart(session.uid) });
  });
}
