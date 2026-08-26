import { NextResponse } from "next/server";

import { getPublicArtwork } from "@/lib/artists/public-artwork";
import { getAuthenticatedSession } from "@/lib/auth/server-session";
import { addToCart, cartHasOtherArtist, readCart, removeFromCart } from "@/lib/commerce/cart";

function failure(error: unknown, status: number, fallback: string) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status },
  );
}

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedSession(request);
    return NextResponse.json({ items: await readCart(session.uid) });
  } catch (error) {
    return failure(error, 401, "Unable to load cart.");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedSession(request);
    const body = (await request.json()) as { itemId?: string; username?: string };

    if (!body.itemId || !body.username) {
      return NextResponse.json({ error: "Artwork is required." }, { status: 400 });
    }

    const artwork = await getPublicArtwork(body.username, body.itemId);

    if (!artwork || artwork.item.pricingInventory.availability !== "original_available") {
      return NextResponse.json({ error: "This artwork is not available." }, { status: 409 });
    }

    if (await cartHasOtherArtist(session.uid, artwork.artistUid)) {
      return NextResponse.json(
        { error: "Checkout supports one artist at a time. Remove the other artist’s work first." },
        { status: 409 },
      );
    }

    await addToCart(session.uid, {
      artistUid: artwork.artistUid,
      artistUsername: artwork.artistUsername,
      itemId: artwork.item.id,
    });

    return NextResponse.json({ items: await readCart(session.uid) });
  } catch (error) {
    return failure(error, 401, "Unable to update cart.");
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAuthenticatedSession(request);
    const body = (await request.json()) as { itemId?: string };

    if (!body.itemId) {
      return NextResponse.json({ error: "Artwork is required." }, { status: 400 });
    }

    await removeFromCart(session.uid, body.itemId);
    return NextResponse.json({ items: await readCart(session.uid) });
  } catch (error) {
    return failure(error, 401, "Unable to update cart.");
  }
}
