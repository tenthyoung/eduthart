import { NextResponse } from "next/server";

import { getPublicArtwork } from "@/lib/artists/public-artwork";
import {
  clearRecentlyViewed,
  listRecentlyViewed,
  recordArtworkView,
} from "@/lib/collectors/recently-viewed";
import { apiError, withSession } from "@/lib/api/handler";

export function GET(request: Request) {
  return withSession(request, async (session) =>
    NextResponse.json({ recentlyViewed: await listRecentlyViewed(session.uid) }),
  );
}

export function POST(request: Request) {
  return withSession(request, async (session) => {
    // Recording a view is fire-and-forget from the artwork page, so navigating
    // away can cut the request off mid-body. That is not worth logging as a
    // parse failure.
    const body = (await request.json().catch(() => ({}))) as {
      itemId?: string;
      username?: string;
    };

    if (!body.itemId || !body.username) {
      return apiError("An artwork is required.", 400);
    }

    const artwork = await getPublicArtwork(body.username, body.itemId);

    if (!artwork) {
      return apiError("That artwork could not be found.", 404, "not-found");
    }

    return NextResponse.json({
      recentlyViewed: await recordArtworkView(session.uid, {
        artistUid: artwork.artistUid,
        artistUsername: artwork.artistUsername,
        itemId: artwork.item.id,
      }),
    });
  });
}

export function DELETE(request: Request) {
  return withSession(request, async (session) => {
    await clearRecentlyViewed(session.uid);
    return NextResponse.json({ recentlyViewed: [] });
  });
}
