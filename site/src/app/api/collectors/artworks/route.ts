import { NextResponse } from "next/server";

import { getIndexedArtwork } from "@/lib/artists/artwork-index";

/**
 * Look up indexed artwork by key.
 *
 * Public data, so no session is required: the comparison tray lives in the
 * browser and needs to resolve its keys before a visitor has signed in.
 */
export async function GET(request: Request) {
  const keys = new URL(request.url).searchParams.get("keys")?.split(",").filter(Boolean) ?? [];

  if (keys.length === 0) {
    return NextResponse.json({ artworks: [] });
  }

  const artworks = await Promise.all(keys.slice(0, 8).map((key) => getIndexedArtwork(key)));

  return NextResponse.json({ artworks: artworks.filter((artwork) => artwork !== null) });
}
