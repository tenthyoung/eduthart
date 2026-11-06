import { afterEach, describe, expect, test } from "vitest";

import {
  GET as listingFlowGet,
  PATCH as listingFlowPatch,
} from "@/app/api/artists/listing-flow/route";
import { POST as dmcaRoute } from "@/app/api/dmca/route";
import {
  getArtworkModerationDetail,
  listModerationQueue,
  moderateArtwork,
} from "@/lib/admin/moderation";
import { getIndexedArtwork } from "@/lib/artists/artwork-index";
import type { ListingStudioDraft } from "@/lib/artists/listing-flow";
import { getPublicArtwork } from "@/lib/artists/public-artwork";
import { buildArtworkKey } from "@/lib/collectors/artwork-reference";
import { setEmailBindingForTesting } from "@/lib/email/send";
import { parseReportedPages } from "@/lib/reporting";
import { listRootDocuments } from "@/lib/store/document-store";

import {
  findNotification,
  listNotifications,
  seedGallery,
} from "./support/accounts";
import { fakeEmailBinding } from "./support/email";
import { callRoute, callRouteOk, type RouteHandler } from "./support/routes";

/**
 * The DMCA notice, from the public form through to the moderation console.
 *
 * A notice names artwork pages by URL. The route saves it whole, emails the
 * team, and files a report against each listing it names; the admin queue is
 * built from those reports, and acting on one takes the piece off the site
 * and tells the artist. All of it runs against the real file-backed store,
 * with only the email binding replaced.
 */

const dmca = dmcaRoute as unknown as RouteHandler;
const loadStudio = listingFlowGet as unknown as RouteHandler;
const saveStudio = listingFlowPatch as unknown as RouteHandler;

const SITE = "https://www.eduthart.com";

function noticeFor(urls: string[]) {
  return {
    accuracy: true,
    contentUrls: urls.join("\n"),
    copyrightedWorkDescription:
      "A series of twelve ink drawings of the harbour.",
    email: "claimant@example.com",
    explanation: "These were lifted from my portfolio site without permission.",
    fullName: "Rosa Claimant",
    goodFaith: true,
    mailingAddress: "1 Harbour Lane",
    phone: "555-0100",
    relationship: "owner",
    signature: "Rosa Claimant",
  };
}

async function listNotices() {
  return listRootDocuments("dmca_notices");
}

afterEach(() => {
  setEmailBindingForTesting(undefined);
});

describe("reading the URLs in a notice", () => {
  test("keeps artwork and artist pages on EduthArt hosts and drops the rest", () => {
    expect(
      parseReportedPages([
        "https://www.eduthart.com/artists/marina/art/item-1",
        "https://eduthart.com/artists/Marina/art/item-1",
        "https://eduthart.com/artists/marina",
        "https://eduthart.com/artists/marina/",
        "https://eduthart.com/browse?category=Painting",
        "https://example.com/artists/marina/art/item-1",
        "https://eduthart.com/public-decks/deck-1",
        "not a url",
        "",
      ])
    ).toEqual([
      { itemId: "item-1", kind: "artwork", username: "marina" },
      { kind: "artist", username: "marina" },
    ]);
  });
});

describe("filing a DMCA notice", () => {
  test("saves the notice, emails the team, and flags the named artwork for review", async () => {
    const sent = fakeEmailBinding();
    const { artist, artwork } = await seedGallery("dmca-flag");

    const { status } = await callRoute(dmca, {
      body: noticeFor([`${SITE}${artwork.href}`]),
    });

    expect(status).toBe(200);

    const notices = await listNotices();
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      email: "claimant@example.com",
      status: "submitted",
      urls: [`${SITE}${artwork.href}`],
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      from: { email: "support@eduthart.com", name: "EduthArt Support" },
      replyTo: "claimant@example.com",
      to: ["support@eduthart.com"],
    });
    expect(sent[0].subject).toContain("DMCA notice");
    expect(sent[0].text).toContain("Rosa Claimant");
    expect(sent[0].text).toContain(
      `"Harbour Light" by Marina Vale — ${SITE}${artwork.href}`
    );

    const queue = await listModerationQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      artistName: "Marina Vale",
      artistUid: artist.uid,
      href: artwork.href,
      listed: true,
      moderationStatus: null,
      openReportCount: 1,
      title: "Harbour Light",
    });

    const detail = await getArtworkModerationDetail(queue[0].artworkKey);
    expect(detail?.openReports).toHaveLength(1);
    expect(detail?.openReports[0]).toMatchObject({
      reason: "DMCA notice submitted",
      reportSubcategory: "owner",
      reportType: "copyright",
      reporterEmail: "claimant@example.com",
      status: "open",
    });
    expect(detail?.openReports[0].details).toContain("Rosa Claimant");
    expect(detail?.openReports[0].details).toContain(
      "lifted from my portfolio site"
    );
  });

  test("accepts an artist page URL and names the artist in the email, with no artwork to flag", async () => {
    const sent = fakeEmailBinding();
    const { artist } = await seedGallery("dmca-artist");

    const { status } = await callRoute(dmca, {
      body: noticeFor([`${SITE}/artists/${artist.username}`]),
    });

    expect(status).toBe(200);
    expect(await listNotices()).toHaveLength(1);
    expect(sent[0].text).toContain(
      `Marina Vale — ${SITE}/artists/${artist.username}`
    );
    expect(sent[0].text).toContain(
      "Matched artworks (flagged in the moderation queue):\nNone"
    );
    expect(await listModerationQueue()).toHaveLength(0);
  });

  test("rejects a notice that names no EduthArt page before saving or emailing anything", async () => {
    const sent = fakeEmailBinding();

    const { body, status } = await callRoute<{ error: string }>(dmca, {
      body: noticeFor(["https://example.com/stolen-art", "public-decks/1"]),
    });

    expect(status).toBe(400);
    expect(body.error).toContain("EduthArt artwork or artist page URL");
    expect(await listNotices()).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  test("rejects an incomplete notice before saving or emailing anything", async () => {
    const sent = fakeEmailBinding();
    const { artwork } = await seedGallery("dmca-invalid");

    const { status } = await callRoute(dmca, {
      body: { ...noticeFor([`${SITE}${artwork.href}`]), goodFaith: false },
    });

    expect(status).toBe(400);
    expect(await listNotices()).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  test("still succeeds when the email is refused, since the notice is saved", async () => {
    fakeEmailBinding({ fail: true });
    const { artwork } = await seedGallery("dmca-email-down");

    const { status } = await callRoute(dmca, {
      body: noticeFor([`${SITE}${artwork.href}`]),
    });

    expect(status).toBe(200);
    expect(await listNotices()).toHaveLength(1);
    expect(await listModerationQueue()).toHaveLength(1);
  });

  test("still succeeds with no email binding at all", async () => {
    const { artwork } = await seedGallery("dmca-no-email");

    const { status } = await callRoute(dmca, {
      body: noticeFor([`${SITE}${artwork.href}`]),
    });

    expect(status).toBe(200);
    expect(await listNotices()).toHaveLength(1);
  });
});

describe("acting on a reported artwork", () => {
  async function reportedArtwork(suffix: string) {
    const { artist, artwork } = await seedGallery(suffix);
    await callRoute(dmca, { body: noticeFor([`${SITE}${artwork.href}`]) });
    const artworkKey = buildArtworkKey({
      artistUid: artist.uid,
      itemId: artwork.itemId,
    });

    return { artist, artwork, artworkKey };
  }

  test("taking it down hides it from the site, closes the report and tells the artist why", async () => {
    const sent = fakeEmailBinding();
    const { artist, artwork, artworkKey } = await reportedArtwork("dmca-hide");

    await moderateArtwork({
      action: "hide",
      artworkKey,
      moderatorUid: "admin-1",
      reason: "Matches the claimant's portfolio; pending their counter-notice.",
    });

    expect(await getPublicArtwork(artwork.username, artwork.itemId)).toBeNull();
    expect(await getIndexedArtwork(artworkKey)).toBeNull();
    expect(await listModerationQueue()).toHaveLength(0);

    const detail = await getArtworkModerationDetail(artworkKey);
    expect(detail).toMatchObject({
      listed: false,
      moderation: { moderatedBy: "admin-1", status: "hidden" },
      openReports: [],
    });
    expect(detail?.resolvedReports).toHaveLength(1);
    expect(detail?.resolvedReports[0]).toMatchObject({
      resolutionAction: "hide",
      status: "resolved",
    });

    const notification = await findNotification(
      artist.uid,
      "listing_moderated"
    );
    expect(notification.title).toBe('"Harbour Light" has been taken down');
    expect(notification.body).toContain("pending their counter-notice");
    expect(notification.actionHref).toBe(
      `/artists/${artwork.username}/listings/${artwork.itemId}`
    );

    const toArtist = sent.filter((email) => email.to.includes(artist.email));
    expect(toArtist).toHaveLength(1);
    expect(toArtist[0].subject).toBe(
      'Your listing "Harbour Light" has been taken down'
    );
  });

  test("a takedown survives the artist re-saving their studio", async () => {
    const { artist, artwork, artworkKey } =
      await reportedArtwork("dmca-sticky");

    await moderateArtwork({
      action: "remove",
      artworkKey,
      moderatorUid: "admin-1",
      reason: "Confirmed infringement.",
    });

    // What the studio page does: load the whole studio, edit it, save it all
    // back. Here the moderation is stripped from the payload, as a tab opened
    // before the takedown, or a tampered client, would send it.
    const path = `/api/artists/listing-flow?username=${artwork.username}`;
    const { studio } = await callRouteOk<{ studio: ListingStudioDraft }>(
      loadStudio,
      { as: artist.uid, path }
    );
    for (const item of studio.items) {
      item.moderation = null;
      item.pricingInventory.price = "900";
    }
    await callRouteOk(saveStudio, {
      as: artist.uid,
      body: { studio },
      method: "PATCH",
      path,
    });

    expect(await getPublicArtwork(artwork.username, artwork.itemId)).toBeNull();
    expect(await getIndexedArtwork(artworkKey)).toBeNull();
    expect(
      (await getArtworkModerationDetail(artworkKey))?.moderation?.status
    ).toBe("removed");
  });

  test("restoring puts it back and tells the artist", async () => {
    fakeEmailBinding();
    const { artist, artwork, artworkKey } =
      await reportedArtwork("dmca-restore");

    await moderateArtwork({
      action: "hide",
      artworkKey,
      moderatorUid: "admin-1",
      reason: "Pending review.",
    });
    await moderateArtwork({
      action: "restore",
      artworkKey,
      moderatorUid: "admin-1",
      reason: "The claimant withdrew the notice.",
    });

    expect(
      await getPublicArtwork(artwork.username, artwork.itemId)
    ).not.toBeNull();
    expect(await getIndexedArtwork(artworkKey)).not.toBeNull();
    expect(await getArtworkModerationDetail(artworkKey)).toMatchObject({
      listed: true,
      moderation: null,
    });

    const titles = (await listNotifications(artist.uid))
      .filter((notification) => notification.kind === "listing_moderated")
      .map((notification) => notification.title)
      .sort();
    expect(titles).toEqual([
      '"Harbour Light" has been taken down',
      '"Harbour Light" is back on EduthArt',
    ]);
  });

  test("a warning leaves it listed and tells the artist", async () => {
    const { artist, artwork, artworkKey } = await reportedArtwork("dmca-warn");

    await moderateArtwork({
      action: "warn",
      artworkKey,
      moderatorUid: "admin-1",
      reason: "Please credit the photographer in the description.",
    });

    expect(
      await getPublicArtwork(artwork.username, artwork.itemId)
    ).not.toBeNull();
    expect(await listModerationQueue()).toHaveLength(0);
    expect(await getArtworkModerationDetail(artworkKey)).toMatchObject({
      listed: true,
      moderation: { status: "warned" },
    });

    const notification = await findNotification(
      artist.uid,
      "listing_moderated"
    );
    expect(notification.title).toBe('A warning about "Harbour Light"');
  });

  test("dismissing closes the reports without touching the listing or the artist", async () => {
    const { artist, artwork, artworkKey } =
      await reportedArtwork("dmca-dismiss");

    await moderateArtwork({
      action: "dismiss",
      artworkKey,
      moderatorUid: "admin-1",
      reason: "Not the same work.",
    });

    expect(
      await getPublicArtwork(artwork.username, artwork.itemId)
    ).not.toBeNull();
    expect(await listModerationQueue()).toHaveLength(0);
    expect(await getArtworkModerationDetail(artworkKey)).toMatchObject({
      listed: true,
      moderation: null,
    });
    expect(
      (await listNotifications(artist.uid)).filter(
        (notification) => notification.kind === "listing_moderated"
      )
    ).toHaveLength(0);
  });

  test("refuses an unknown action or a missing reason", async () => {
    const { artworkKey } = await reportedArtwork("dmca-bad-action");

    await expect(
      moderateArtwork({
        action: "obliterate",
        artworkKey,
        moderatorUid: "admin-1",
        reason: "x",
      })
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      moderateArtwork({
        action: "hide",
        artworkKey,
        moderatorUid: "admin-1",
        reason: "",
      })
    ).rejects.toMatchObject({ status: 400 });
    expect(await listModerationQueue()).toHaveLength(1);
  });
});
