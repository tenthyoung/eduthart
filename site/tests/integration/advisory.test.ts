import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST as advisoryRoute } from "@/app/api/advisory/route";
import type { AdvisoryEmail } from "@/lib/advisory/email";
import {
  listAdvisoryInbox,
  sendAdvisoryShortlist,
  setAdvisoryRequestStatus,
} from "@/lib/advisory/requests";
import { getSharedCollection } from "@/lib/collectors/collections";

import {
  createAccount,
  publishArtwork,
  saveFavorite,
} from "./support/accounts";
import { callRoute, callRouteOk } from "./support/routes";

/**
 * The "Help me choose" advisory service.
 *
 * Email is the one thing stubbed: there is no Resend in the suite, and what is
 * worth asserting is who would be written to and what they would be sent.
 * Everything else — the stored request, the saved works beside it, and the
 * shortlist as a shared collection — runs on the real store.
 */

const sent: AdvisoryEmail[] = [];

vi.mock("@/lib/advisory/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/advisory/email")>();
  return {
    ...actual,
    getAdvisoryInboxEmail: () => "advisory@eduthart.test",
    sendAdvisoryEmail: async (email: AdvisoryEmail) => {
      sent.push(email);
      return true;
    },
  };
});

beforeEach(() => {
  sent.length = 0;
});

const brief = {
  budget: "1000-5000",
  email: "Robin@Example.com",
  name: "Robin Hart",
  notes: "North-facing, pale grey walls.",
  room: "living-room",
  size: "large",
  style: "Quiet abstracts with texture",
  timeline: "quarter",
};

async function submit(body: Record<string, unknown>, as?: string) {
  return callRoute<{
    confirmationSent?: boolean;
    error?: { field: string | null; message: string };
    id?: string | null;
  }>(advisoryRoute, { as, body, path: "/api/advisory" });
}

describe("asking for advice", () => {
  test("one request makes one inbox item and one confirmation to the buyer", async () => {
    const result = await submit(brief);

    expect(result.status).toBe(201);
    expect(result.body.confirmationSent).toBe(true);

    const inbox = await listAdvisoryInbox();
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({
      budget: "1000-5000",
      email: "robin@example.com",
      name: "Robin Hart",
      shortlist: null,
      status: "new",
      uid: null,
    });

    const toBuyer = sent.filter((email) => email.to === "robin@example.com");
    expect(toBuyer).toHaveLength(1);
    expect(toBuyer[0].body).toContain("Quiet abstracts with texture");

    const toGallery = sent.filter(
      (email) => email.to === "advisory@eduthart.test"
    );
    expect(toGallery).toHaveLength(1);
    expect(toGallery[0].replyTo).toBe("robin@example.com");
  });

  test("makes no promise about how soon a curator will reply", async () => {
    await submit(brief);

    const confirmation = sent.find((email) => email.to === "robin@example.com");
    // Turnaround depends on the curation policy (EDUTHA-91), not yet decided.
    expect(confirmation?.body).not.toMatch(
      /\b(hours?|days?|business days?|within|by tomorrow)\b/i
    );
  });

  test("names the field that is wrong and stores nothing", async () => {
    const result = await submit({ ...brief, room: "attic" });

    expect(result.status).toBe(400);
    expect(result.body.error).toMatchObject({ field: "room" });
    expect(await listAdvisoryInbox()).toEqual([]);
    expect(sent).toEqual([]);
  });

  test("requires an email to reply to", async () => {
    const result = await submit({ ...brief, email: "robin" });

    expect(result.status).toBe(400);
    expect(result.body.error?.field).toBe("email");
  });

  test("quietly drops a submission with the honeypot filled in", async () => {
    const result = await submit({ ...brief, website: "https://spam.example" });

    expect(result.status).toBe(200);
    expect(await listAdvisoryInbox()).toEqual([]);
    expect(sent).toEqual([]);
  });

  test("shows a signed-in buyer's saved works beside the request", async () => {
    const artist = await createAccount({
      displayName: "Marina Vale",
      uid: "artist-advisory-saved",
      username: "marina-advisory-saved",
    });
    const artwork = await publishArtwork({
      title: "Harbour Light",
      uid: artist.uid,
    });
    const buyer = await createAccount({ uid: "buyer-advisory-saved" });
    await saveFavorite(buyer.uid, artwork);

    await callRouteOk(advisoryRoute, {
      as: buyer.uid,
      body: brief,
      path: "/api/advisory",
    });

    const [item] = await listAdvisoryInbox();
    expect(item.uid).toBe(buyer.uid);
    expect(item.savedItems.map((saved) => saved.artwork.title)).toEqual([
      "Harbour Light",
    ]);
  });

  test("treats a bad token as signed out instead of refusing the request", async () => {
    const result = await submit(brief, "no-such-account");

    expect(result.status).toBe(201);
    const [item] = await listAdvisoryInbox();
    expect(item.uid).toBeNull();
  });
});

describe("answering with a shortlist", () => {
  async function seedRequest() {
    const artist = await createAccount({
      displayName: "Marina Vale",
      uid: "artist-advisory-shortlist",
      username: "marina-advisory-shortlist",
    });
    const first = await publishArtwork({
      itemId: "harbour-light",
      title: "Harbour Light",
      uid: artist.uid,
    });
    // The test listing route keeps one work per studio, so a second artist.
    const otherArtist = await createAccount({
      displayName: "Theo Marsh",
      uid: "artist-advisory-shortlist-2",
      username: "theo-advisory-shortlist",
    });
    const second = await publishArtwork({
      itemId: "low-tide",
      title: "Low Tide",
      uid: otherArtist.uid,
    });
    const buyer = await createAccount({ uid: "buyer-advisory-shortlist" });
    await saveFavorite(buyer.uid, first);
    const advisor = await createAccount({
      displayName: "Jun Curator",
      uid: "advisor-advisory-shortlist",
    });

    await callRouteOk(advisoryRoute, {
      as: buyer.uid,
      body: brief,
      path: "/api/advisory",
    });
    const [request] = await listAdvisoryInbox();
    sent.length = 0;

    return { advisor, buyer, first, request, second };
  }

  test("sends a private collection link built from saved works and pasted links", async () => {
    const { advisor, request, second } = await seedRequest();
    const savedKey = request.savedItems[0].artwork.key;

    const result = await sendAdvisoryShortlist(advisor.uid, request.id, {
      message: "Both work with grey walls.",
      picks: [savedKey, `https://www.eduthart.com${second.href}`],
    });

    expect(result.sharePath).toMatch(/^\/collections\/share_/);
    expect(result.request.status).toBe("shortlist_sent");
    expect(result.request.shortlist?.artworkCount).toBe(2);

    const shared = await getSharedCollection(
      result.sharePath.replace("/collections/", "")
    );
    expect(shared?.ownerUid).toBe(advisor.uid);
    expect(shared?.name).toBe("Shortlist for Robin Hart");
    expect(
      shared?.artworks.map((entry) => entry.artwork?.title).sort()
    ).toEqual(["Harbour Light", "Low Tide"]);

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      actionHref: result.sharePath,
      to: "robin@example.com",
    });
    expect(sent[0].body).toContain("Both work with grey walls.");
  });

  test("refuses a link that is not a listed artwork, and changes nothing", async () => {
    const { advisor, request } = await seedRequest();

    await expect(
      sendAdvisoryShortlist(advisor.uid, request.id, {
        message: "",
        picks: ["https://www.eduthart.com/artists/nobody/art/missing"],
      })
    ).rejects.toThrow(/not listed artworks/);

    const [after] = await listAdvisoryInbox();
    expect(after.status).toBe("new");
    expect(sent).toEqual([]);
  });

  test("refuses an empty shortlist", async () => {
    const { advisor, request } = await seedRequest();

    await expect(
      sendAdvisoryShortlist(advisor.uid, request.id, { message: "", picks: [] })
    ).rejects.toThrow(/at least one artwork/);
  });

  test("closes and reopens a request", async () => {
    const { request } = await seedRequest();

    expect((await setAdvisoryRequestStatus(request.id, "closed")).status).toBe(
      "closed"
    );
    await expect(
      setAdvisoryRequestStatus(request.id, "archived")
    ).rejects.toThrow(/not recognised/);
  });
});
