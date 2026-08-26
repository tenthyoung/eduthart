import { NextResponse } from "next/server";

import { getPublicArtwork } from "@/lib/artists/public-artwork";
import {
  addArtworkToCollection,
  createCollection,
  deleteCollection,
  listCollections,
  removeArtworkFromCollection,
  renameCollection,
  setCollectionVisibility,
} from "@/lib/collectors/collections";
import { apiError, withSession } from "@/lib/api/handler";

type CollectionBody = {
  artworkKey?: string;
  collectionId?: string;
  description?: string | null;
  isPublic?: boolean;
  itemId?: string;
  name?: string;
  username?: string;
};

export function GET(request: Request) {
  return withSession(request, async (session) =>
    NextResponse.json({ collections: await listCollections(session.uid) }),
  );
}

export function POST(request: Request) {
  return withSession(request, async (session) => {
    const body = (await request.json()) as CollectionBody;

    // Adding an artwork and creating a collection share this route so the
    // client only has to know one endpoint for "organize my favorites".
    if (body.collectionId) {
      if (!body.itemId || !body.username) {
        return apiError("An artwork is required.", 400);
      }

      const artwork = await getPublicArtwork(body.username, body.itemId);

      if (!artwork) {
        return apiError("That artwork could not be found.", 404, "not-found");
      }

      await addArtworkToCollection(session.uid, body.collectionId, {
        artistUid: artwork.artistUid,
        artistUsername: artwork.artistUsername,
        itemId: artwork.item.id,
      });

      return NextResponse.json({ collections: await listCollections(session.uid) });
    }

    await createCollection(session.uid, body.name ?? "", body.description);
    return NextResponse.json({ collections: await listCollections(session.uid) });
  });
}

export function PATCH(request: Request) {
  return withSession(request, async (session) => {
    const body = (await request.json()) as CollectionBody;

    if (!body.collectionId) {
      return apiError("A collection is required.", 400);
    }

    if (typeof body.isPublic === "boolean") {
      await setCollectionVisibility(session.uid, body.collectionId, body.isPublic);
    }

    if (typeof body.name === "string") {
      await renameCollection(session.uid, body.collectionId, body.name);
    }

    return NextResponse.json({ collections: await listCollections(session.uid) });
  });
}

export function DELETE(request: Request) {
  return withSession(request, async (session) => {
    const body = (await request.json()) as CollectionBody;

    if (!body.collectionId) {
      return apiError("A collection is required.", 400);
    }

    if (body.artworkKey) {
      await removeArtworkFromCollection(session.uid, body.collectionId, body.artworkKey);
    } else {
      await deleteCollection(session.uid, body.collectionId);
    }

    return NextResponse.json({ collections: await listCollections(session.uid) });
  });
}
