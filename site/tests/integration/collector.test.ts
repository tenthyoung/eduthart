import { describe, expect, test } from "vitest";

import {
  DELETE as deleteAddressRoute,
  GET as listAddressesRoute,
  PATCH as defaultAddressRoute,
  POST as saveAddressRoute,
} from "@/app/api/collectors/addresses/route";
import { GET as recommendationsRoute } from "@/app/api/collectors/recommendations/route";
import type { SavedAddress } from "@/lib/collectors/addresses";
import type { ArtworkRecommendation } from "@/lib/collectors/recommendations";

import {
  addAddress,
  createAccount,
  followArtist,
  publishArtwork,
  saveFavorite,
  seedGallery,
} from "./support/accounts";
import { callRoute, callRouteOk } from "./support/routes";

/**
 * Collector surfaces whose substance is the data, not the page.
 *
 * Favorites, follows, and the compare tray stay in the browser suite, because
 * what is worth checking there is the button state a collector sees. These are
 * the ones where the page is a thin render of a server answer.
 */

async function listAddresses(uid: string) {
  const { addresses } = await callRouteOk<{ addresses: SavedAddress[] }>(
    listAddressesRoute,
    { as: uid, path: "/api/collectors/addresses" }
  );

  return addresses;
}

async function recommendations(uid: string) {
  const { recommendations: results } = await callRouteOk<{
    recommendations: ArtworkRecommendation[];
  }>(recommendationsRoute, {
    as: uid,
    path: "/api/collectors/recommendations",
  });

  return results;
}

describe("recommendations", () => {
  test("has nothing to suggest until the collector saves or follows something", async () => {
    await seedGallery("recommend-empty");
    const collector = await createAccount({ uid: "collector-recommend-empty" });

    expect(await recommendations(collector.uid)).toEqual([]);
  });

  test("suggests the rest of an artist's catalogue once they are followed", async () => {
    const artist = await createAccount({
      displayName: "Marina Vale",
      uid: "artist-recommend",
      username: "marina-recommend",
    });
    await publishArtwork({ title: "Harbour Light", uid: artist.uid });
    const collector = await createAccount({ uid: "collector-recommend" });

    await followArtist(collector.uid, artist.username!);

    const [top] = await recommendations(collector.uid);

    expect(top.artwork.title).toBe("Harbour Light");
    expect(top.reasons).toContain("You follow Marina Vale");
  });

  test("ranks a followed artist above an equally similar stranger", async () => {
    const saved = await createAccount({
      displayName: "Marina Vale",
      uid: "artist-rank-saved",
      username: "marina-rank-saved",
    });
    const followed = await createAccount({
      displayName: "Tomas Reed",
      uid: "artist-rank-followed",
      username: "tomas-rank-followed",
    });
    const stranger = await createAccount({
      displayName: "Nia Sculptor",
      uid: "artist-rank-stranger",
      username: "nia-rank-stranger",
    });

    // Three pieces alike in category, medium, style, and tags. The only thing
    // separating the last two is whether the collector follows their artist.
    const favorite = await publishArtwork({
      title: "Harbour Light",
      uid: saved.uid,
    });
    await publishArtwork({ title: "Harbour Dusk", uid: followed.uid });
    await publishArtwork({ title: "Quarry Dusk", uid: stranger.uid });

    const collector = await createAccount({ uid: "collector-rank" });
    await saveFavorite(collector.uid, favorite);
    await followArtist(collector.uid, followed.username!);

    const titles = (await recommendations(collector.uid)).map(
      (recommendation) => recommendation.artwork.title
    );

    // The saved piece itself is not recommended back to the collector.
    expect(titles).not.toContain("Harbour Light");
    expect(titles).toEqual(["Harbour Dusk", "Quarry Dusk"]);
  });
});

describe("saved addresses", () => {
  test("saves a shipping address and makes the first one the default", async () => {
    const collector = await createAccount({ uid: "address-user" });

    await addAddress(collector.uid, {
      city: "Brooklyn",
      line1: "18 Harbour Road",
      name: "Robin Buyer",
      postalCode: "11201",
      region: "NY",
    });

    const [address, ...rest] = await listAddresses(collector.uid);

    expect(rest).toEqual([]);
    expect(address).toMatchObject({
      city: "Brooklyn",
      country: "US",
      isDefault: true,
      kind: "shipping",
      line1: "18 Harbour Road",
      name: "Robin Buyer",
      postalCode: "11201",
      region: "NY",
    });
  });

  test("keeps shipping and billing addresses apart", async () => {
    const collector = await createAccount({ uid: "address-kinds-user" });

    await addAddress(collector.uid, {
      city: "Brooklyn",
      line1: "18 Harbour Road",
      name: "Robin Buyer",
      postalCode: "11201",
    });
    await addAddress(collector.uid, {
      city: "Albany",
      kind: "billing",
      line1: "9 Ledger Street",
      name: "Robin Buyer",
      postalCode: "12207",
    });

    const addresses = await listAddresses(collector.uid);

    // Each kind has its own default rather than one winner across both.
    expect(
      addresses
        .filter((address) => address.isDefault)
        .map((address) => address.kind)
        .sort()
    ).toEqual(["billing", "shipping"]);
  });

  test("moves the default to the address the collector picks", async () => {
    const collector = await createAccount({ uid: "address-default-user" });

    await addAddress(collector.uid, {
      city: "Brooklyn",
      line1: "18 Harbour Road",
      name: "Robin Buyer",
      postalCode: "11201",
    });
    const addresses = await addAddress(collector.uid, {
      city: "Hudson",
      line1: "4 Kiln Lane",
      name: "Robin Buyer",
      postalCode: "12534",
    });

    const second = addresses.find(
      (address) => address.line1 === "4 Kiln Lane"
    )!;
    expect(second.isDefault).toBe(false);

    const { addresses: updated } = await callRouteOk<{
      addresses: SavedAddress[];
    }>(defaultAddressRoute, {
      as: collector.uid,
      body: { id: second.id },
      method: "PATCH",
      path: "/api/collectors/addresses",
    });

    expect(
      updated
        .filter((address) => address.isDefault)
        .map((address) => address.line1)
    ).toEqual(["4 Kiln Lane"]);
  });

  test("removes an address", async () => {
    const collector = await createAccount({ uid: "address-remove-user" });

    const [address] = await addAddress(collector.uid, {
      city: "Brooklyn",
      line1: "18 Harbour Road",
      name: "Robin Buyer",
      postalCode: "11201",
    });

    await callRouteOk(deleteAddressRoute, {
      as: collector.uid,
      body: { id: address.id },
      method: "DELETE",
      path: "/api/collectors/addresses",
    });

    expect(await listAddresses(collector.uid)).toEqual([]);
  });

  test("rejects an address that is missing a required field", async () => {
    const collector = await createAccount({ uid: "address-invalid-user" });

    const result = await callRoute<{ error: { message: string } }>(
      saveAddressRoute,
      {
        as: collector.uid,
        body: { city: "Brooklyn", name: "Robin Buyer" },
        path: "/api/collectors/addresses",
      }
    );

    expect(result.status).toBe(400);
    expect(await listAddresses(collector.uid)).toEqual([]);
  });

  test("refuses to read another collector's addresses", async () => {
    const result = await callRoute(listAddressesRoute, {
      path: "/api/collectors/addresses",
    });

    expect(result.status).toBe(401);
  });
});
