import { describe, expect, test } from "vitest";

import {
  GET as listingFlowGet,
  PATCH as listingFlowPatch,
} from "@/app/api/artists/listing-flow/route";
import { POST as seedAccountRoute } from "@/app/api/test/e2e-auth/route";
import {
  ARTIST_NOT_APPROVED_CODE,
  isApprovedArtist,
  isArtistNotApprovedResponse,
} from "@/lib/artists/artist-approval";
import {
  createEmptyListingStudio,
  type ListingStudioDraft,
} from "@/lib/artists/listing-flow";
import { loadListingStudio } from "@/lib/artists/listing-store";
import { loadAccountProfile } from "@/lib/auth/profile-store";

import {
  isRealListing,
  planApproval,
} from "../../scripts/approve-existing-artists-plan.mjs";

import { createAccount, publishArtwork } from "./support/accounts";
import { callRoute, callRouteOk } from "./support/routes";

/**
 * Only approved artists can list artwork (EDUTHA-137, from EDUTHA-122).
 *
 * The gate is the listing API: the studio pages only render what it allows,
 * so these drive the route handlers the pages call.
 */

type ErrorBody = { error: { code: string; message: string } };

function studioPath(username: string) {
  return `/api/artists/listing-flow?username=${username}`;
}

describe("listing gate", () => {
  test("a new account is not an approved artist", async () => {
    const account = await createAccount({
      uid: "gate-new",
      username: "gate-new",
    });

    const profile = await loadAccountProfile(account.uid);
    expect(profile?.artistApproved).toBe(false);
    expect(isApprovedArtist(profile)).toBe(false);
  });

  test("an unapproved account cannot open the listing studio", async () => {
    const account = await createAccount({
      uid: "gate-open",
      username: "gate-open",
    });

    const result = await callRoute<ErrorBody>(listingFlowGet, {
      as: account.uid,
      path: studioPath("gate-open"),
    });

    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe(ARTIST_NOT_APPROVED_CODE);
    expect(result.body.error.message).toMatch(/apply to be an artist/i);
    expect(await isArtistNotApprovedResponse(result.response)).toBe(true);
    // Refused before the studio is created, so no starter draft is left behind.
    expect(await loadListingStudio(account.uid)).toBeNull();
  });

  test("an unapproved account cannot save or publish a listing", async () => {
    const account = await createAccount({
      uid: "gate-save",
      username: "gate-save",
    });
    const studio = createEmptyListingStudio();
    studio.items[0].artworkDetails.title = "Sneaked In";
    studio.items[0].salesVisibility.draft = false;
    studio.items[0].salesVisibility.public = true;

    const result = await callRoute<ErrorBody>(listingFlowPatch, {
      as: account.uid,
      body: { studio },
      method: "PATCH",
      path: studioPath("gate-save"),
    });

    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe(ARTIST_NOT_APPROVED_CODE);
    expect(await loadListingStudio(account.uid)).toBeNull();
  });

  test("someone else's studio still reads as not yours, not as unapproved", async () => {
    await createAccount({ uid: "gate-owner", username: "gate-owner" });
    const stranger = await createAccount({
      uid: "gate-stranger",
      username: "gate-stranger",
    });

    const result = await callRoute<ErrorBody>(listingFlowGet, {
      as: stranger.uid,
      path: studioPath("gate-owner"),
    });

    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe("permission-denied");
  });

  test("an approved artist can load and save their studio", async () => {
    const account = await createAccount({
      uid: "gate-approved",
      username: "gate-approved",
    });
    await callRouteOk(seedAccountRoute, {
      body: {
        artistApproved: true,
        displayName: account.displayName,
        email: account.email,
        uid: account.uid,
        username: "gate-approved",
      },
      path: "/api/test/e2e-auth",
    });

    const { studio } = await callRouteOk<{ studio: ListingStudioDraft }>(
      listingFlowGet,
      { as: account.uid, path: studioPath("gate-approved") }
    );
    studio.items[0].artworkDetails.title = "Approved Work";

    await callRouteOk(listingFlowPatch, {
      as: account.uid,
      body: { studio },
      method: "PATCH",
      path: studioPath("gate-approved"),
    });

    const saved = await loadListingStudio(account.uid);
    expect(saved?.items[0].artworkDetails.title).toBe("Approved Work");
  });

  test("an artist who is already selling keeps access", async () => {
    const artist = await createAccount({
      uid: "gate-selling",
      username: "gate-selling",
    });
    await publishArtwork({ uid: artist.uid });

    expect((await loadAccountProfile(artist.uid))?.artistApproved).toBe(true);
    const result = await callRoute(listingFlowGet, {
      as: artist.uid,
      path: studioPath("gate-selling"),
    });
    expect(result.status).toBe(200);
  });
});

describe("grandfathering script plan", () => {
  const blankStudio = createEmptyListingStudio();
  const titled = createEmptyListingStudio();
  titled.items[0].artworkDetails.title = "Harbour Light";
  const published = createEmptyListingStudio();
  published.items[0].salesVisibility.draft = false;

  test("approves an artist with a titled or published listing", () => {
    expect(planApproval({ flow: titled, uid: "a", user: {} })).toBe("approve");
    expect(planApproval({ flow: published, uid: "b", user: {} })).toBe(
      "approve"
    );
  });

  test("skips the blank starter draft that opening the studio creates", () => {
    expect(isRealListing(blankStudio.items[0])).toBe(false);
    expect(planApproval({ flow: blankStudio, uid: "c", user: {} })).toBe(
      "no-listings"
    );
    expect(planApproval({ flow: null, uid: "d", user: {} })).toBe(
      "no-listings"
    );
  });

  test("handles the legacy single-listing flow", () => {
    const legacy = { artworkDetails: { title: "Old Piece" } };
    expect(planApproval({ flow: legacy, uid: "e", user: {} })).toBe("approve");
  });

  test("leaves an already approved artist alone", () => {
    expect(
      planApproval({ flow: titled, uid: "f", user: { artistApproved: true } })
    ).toBe("already-approved");
  });
});
