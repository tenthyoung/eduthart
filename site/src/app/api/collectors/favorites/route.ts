import { NextResponse } from "next/server";

import { getPublicArtwork } from "@/lib/artists/public-artwork";
import { addFavorite, listFavorites, removeFavorite } from "@/lib/collectors/favorites";
import { apiError, withSession } from "@/lib/api/handler";

type FavoriteBody = { itemId?: string; username?: string };

async function resolveReference(body: FavoriteBody) {
  if (!body.itemId || !body.username) {
    return null;
  }

  const artwork = await getPublicArtwork(body.username, body.itemId);

  if (!artwork) {
    return null;
  }

  return {
    artistUid: artwork.artistUid,
    artistUsername: artwork.artistUsername,
    itemId: artwork.item.id,
  };
}

export function GET(request: Request) {
  return withSession(request, async (session) =>
    NextResponse.json({ favorites: await listFavorites(session.uid) }),
  );
}

export function POST(request: Request) {
  return withSession(request, async (session) => {
    const reference = await resolveReference((await request.json()) as FavoriteBody);

    if (!reference) {
      return apiError("That artwork could not be found.", 404, "not-found");
    }

    await addFavorite(session.uid, reference);
    return NextResponse.json({ favorites: await listFavorites(session.uid) });
  });
}

export function DELETE(request: Request) {
  return withSession(request, async (session) => {
    const reference = await resolveReference((await request.json()) as FavoriteBody);

    if (!reference) {
      return apiError("That artwork could not be found.", 404, "not-found");
    }

    await removeFavorite(session.uid, reference);
    return NextResponse.json({ favorites: await listFavorites(session.uid) });
  });
}
