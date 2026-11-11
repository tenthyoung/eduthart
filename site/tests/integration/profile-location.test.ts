import { afterEach, describe, expect, test, vi } from "vitest";

import {
  GET as readProfileRoute,
  PATCH as updateProfileRoute,
} from "@/app/api/auth/profile/route";
import { GET as placesStatusRoute, POST as placesRoute } from "@/app/api/places/route";
import type { AccountProfile } from "@/lib/auth/account-profile";
import { toProfileLocationFromComponents } from "@/lib/places/google-places";
import {
  describeProfileLocationInput,
  formatProfileLocation,
  toProfileLocationInput,
  toProfileLocationPatch,
} from "@/lib/profile/location";

import { createAccount } from "./support/accounts";
import { callRoute, callRouteOk } from "./support/routes";

/**
 * EDUTHA-130: a profile's location is a city, region and country, never a
 * street address, and free text saved before that is kept, not parsed away.
 */

async function patchProfile(uid: string, body: Record<string, unknown>) {
  const { profile } = await callRouteOk<{ profile: AccountProfile }>(
    updateProfileRoute,
    { as: uid, body, method: "PATCH", path: "/api/auth/profile" }
  );

  return profile;
}

async function readProfile(uid: string) {
  const { profile } = await callRouteOk<{ profile: AccountProfile }>(
    readProfileRoute,
    { as: uid, path: "/api/auth/profile" }
  );

  return profile;
}

const BROOKLYN = {
  city: "Brooklyn",
  region: "New York",
  country: "United States",
  countryCode: "us",
  placeId: "ChIJCSF8lBZEwokRhngABHRcdoI",
};

describe("profile location", () => {
  test("saves city, region and country, and shows them as one line", async () => {
    const artist = await createAccount({ uid: "location-place-user" });

    await patchProfile(artist.uid, { locationPlace: BROOKLYN });

    expect(await readProfile(artist.uid)).toMatchObject({
      location: "Brooklyn, New York, United States",
      locationPlace: { ...BROOKLYN, countryCode: "US" },
    });
  });

  test("a picked city replaces old free text", async () => {
    const artist = await createAccount({ uid: "location-upgrade-user" });

    await patchProfile(artist.uid, { location: "bk baby" });
    await patchProfile(artist.uid, {
      location: "ignored when a place is sent",
      locationPlace: BROOKLYN,
    });

    expect((await readProfile(artist.uid)).location).toBe(
      "Brooklyn, New York, United States"
    );
  });

  test("keeps old free text when no city is picked", async () => {
    const artist = await createAccount({ uid: "location-legacy-user" });

    await patchProfile(artist.uid, { location: "Portland, OR" });
    // What the form sends when someone saves without touching the location.
    await patchProfile(artist.uid, {
      bio: "New bio",
      ...toProfileLocationPatch(
        toProfileLocationInput(await readProfile(artist.uid))
      ),
    });

    expect(await readProfile(artist.uid)).toMatchObject({
      location: "Portland, OR",
      locationPlace: null,
    });
  });

  test("removing the location clears both", async () => {
    const artist = await createAccount({ uid: "location-remove-user" });

    await patchProfile(artist.uid, { locationPlace: BROOKLYN });
    await patchProfile(artist.uid, { location: null, locationPlace: null });

    expect(await readProfile(artist.uid)).toMatchObject({
      location: null,
      locationPlace: null,
    });
  });

  test("rejects a place with no country and keeps the stored one", async () => {
    const artist = await createAccount({ uid: "location-invalid-user" });

    await patchProfile(artist.uid, { locationPlace: BROOKLYN });
    const result = await callRoute(updateProfileRoute, {
      as: artist.uid,
      body: { locationPlace: { city: "Brooklyn", country: "" } },
      method: "PATCH",
      path: "/api/auth/profile",
    });

    expect(result.status).toBe(400);
    expect((await readProfile(artist.uid)).locationPlace?.city).toBe(
      "Brooklyn"
    );
  });

  test("drops anything that isn't a city, region or country", async () => {
    const artist = await createAccount({ uid: "location-extra-user" });

    await patchProfile(artist.uid, {
      locationPlace: { ...BROOKLYN, line1: "123 Main St", postalCode: "11201" },
    });

    const { locationPlace } = await readProfile(artist.uid);
    expect(JSON.stringify(locationPlace)).not.toContain("Main St");
    expect(JSON.stringify(locationPlace)).not.toContain("11201");
  });
});

describe("formatting a location", () => {
  test("skips a missing or repeated region", () => {
    const base = { countryCode: null, placeId: null };

    expect(
      formatProfileLocation({ ...base, city: "Lyon", region: null, country: "France" })
    ).toBe("Lyon, France");
    expect(
      formatProfileLocation({
        ...base,
        city: "Singapore",
        region: "Singapore",
        country: "Singapore",
      })
    ).toBe("Singapore");
  });

  test("an unfinished entry describes the old text, if any", () => {
    expect(
      describeProfileLocationInput({
        city: "Brooklyn",
        region: "",
        country: "",
        countryCode: "",
        placeId: "",
        legacyText: "Portland, OR",
      })
    ).toBe("Portland, OR");
  });
});

describe("reading a Google place", () => {
  test("keeps the neighbourhood the person picked", () => {
    expect(
      toProfileLocationFromComponents(
        "place-1",
        [
          { longText: "Brooklyn", types: ["sublocality_level_1", "sublocality"] },
          { longText: "New York", types: ["locality"] },
          { longText: "New York", shortText: "NY", types: ["administrative_area_level_1"] },
          { longText: "United States", shortText: "US", types: ["country"] },
        ],
        "Brooklyn"
      )
    ).toMatchObject({ city: "Brooklyn", region: "New York" });
  });

  test("takes the city, state and country", () => {
    expect(
      toProfileLocationFromComponents("place-1", [
        { longText: "Brooklyn", shortText: "Brooklyn", types: ["sublocality_level_1", "sublocality"] },
        { longText: "New York", shortText: "New York", types: ["locality", "political"] },
        { longText: "Kings County", shortText: "Kings County", types: ["administrative_area_level_2"] },
        { longText: "New York", shortText: "NY", types: ["administrative_area_level_1"] },
        { longText: "United States", shortText: "US", types: ["country"] },
      ])
    ).toEqual({
      city: "New York",
      region: "New York",
      country: "United States",
      countryCode: "US",
      placeId: "place-1",
    });
  });

  test("uses the postal town where there is no locality", () => {
    expect(
      toProfileLocationFromComponents("place-2", [
        { longText: "Bath", types: ["postal_town"] },
        { longText: "England", types: ["administrative_area_level_1"] },
        { longText: "United Kingdom", shortText: "GB", types: ["country"] },
      ])
    ).toMatchObject({ city: "Bath", region: "England", countryCode: "GB" });
  });

  test("returns nothing without a country", () => {
    expect(
      toProfileLocationFromComponents("place-3", [
        { longText: "Somewhere", types: ["locality"] },
      ])
    ).toBeNull();
  });
});

describe("city search", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("reports itself off without a key", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");

    const status = await callRouteOk<{ enabled: boolean }>(placesStatusRoute, {
      path: "/api/places",
    });
    expect(status.enabled).toBe(false);

    const artist = await createAccount({ uid: "places-off-user" });
    const result = await callRoute(placesRoute, {
      as: artist.uid,
      body: { input: "Brook" },
      method: "POST",
      path: "/api/places",
    });
    expect(result.status).toBe(503);
  });

  test("needs a signed-in account", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-key");

    const result = await callRoute(placesRoute, {
      body: { input: "Brook" },
      method: "POST",
      path: "/api/places",
    });
    expect(result.status).toBe(401);
  });
});
