import { NextResponse } from "next/server";

import { findAccountProfileByUsername } from "@/lib/auth/profile-store";
import {
  followArtist,
  listFollowedArtists,
  unfollowArtist,
} from "@/lib/collectors/follows";
import { apiError, withSession } from "@/lib/api/handler";

type FollowBody = { artistUid?: string; username?: string };

async function resolveArtistUid(body: FollowBody) {
  if (body.artistUid) {
    return body.artistUid;
  }

  if (!body.username) {
    return null;
  }

  return (await findAccountProfileByUsername(body.username))?.uid ?? null;
}

export function GET(request: Request) {
  return withSession(request, async (session) =>
    NextResponse.json({ following: await listFollowedArtists(session.uid) })
  );
}

export function POST(request: Request) {
  return withSession(request, async (session) => {
    const artistUid = await resolveArtistUid(
      (await request.json()) as FollowBody
    );

    if (!artistUid) {
      return apiError("That artist could not be found.", 404, "not-found");
    }

    await followArtist(session.uid, artistUid);
    return NextResponse.json({
      following: await listFollowedArtists(session.uid),
    });
  });
}

export function DELETE(request: Request) {
  return withSession(request, async (session) => {
    const artistUid = await resolveArtistUid(
      (await request.json()) as FollowBody
    );

    if (!artistUid) {
      return apiError("That artist could not be found.", 404, "not-found");
    }

    await unfollowArtist(session.uid, artistUid);
    return NextResponse.json({
      following: await listFollowedArtists(session.uid),
    });
  });
}
