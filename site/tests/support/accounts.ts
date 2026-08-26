import { expect, type Page } from "@playwright/test";

import type { ShippingOriginAddress } from "@/lib/artists/listing-flow";

const E2E_STORAGE_KEY = "eduthart:e2e-user";
const E2E_AUTH_EVENT = "eduthart:e2e-auth-changed";

export type TestAccountOptions = {
  authProviders?: string[];
  bannerURL?: string | null;
  displayName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  photoURL?: string | null;
  shippingOriginAddress?: ShippingOriginAddress | null;
  uid: string;
  username?: string | null;
};

export type TestAccount = Awaited<ReturnType<typeof createAccount>>;

/** Create the account without touching the browser's signed-in user. */
export async function createAccount(page: Page, options: TestAccountOptions) {
  const displayName = options.displayName ?? "Jordan Collector";
  const nameParts = displayName.trim().split(/\s+/);
  const profilePayload = {
    authProviders: options.authProviders ?? ["password"],
    bannerURL: options.bannerURL ?? null,
    displayName,
    email: options.email ?? `${options.uid}@example.com`,
    firstName: options.firstName ?? nameParts[0] ?? "Jordan",
    lastName: options.lastName ?? (nameParts.slice(1).join(" ") || "Collector"),
    photoURL: options.photoURL ?? null,
    shippingOriginAddress: options.shippingOriginAddress ?? null,
    uid: options.uid,
    username: options.username ?? null,
  };

  const response = await page.request.post("/api/test/e2e-auth", { data: profilePayload });
  expect(response.ok()).toBeTruthy();

  return profilePayload;
}

export async function signInAs(page: Page, profile: TestAccount) {
  await page.evaluate(
    ({ authEventName, storageKey, user }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(user));
      window.dispatchEvent(new Event(authEventName));
    },
    {
      authEventName: E2E_AUTH_EVENT,
      storageKey: E2E_STORAGE_KEY,
      user: {
        displayName: profile.displayName,
        email: profile.email,
        photoURL: profile.photoURL,
        providerIds: profile.authProviders,
        uid: profile.uid,
      },
    },
  );

  await page.waitForFunction(
    ({ expectedUid, storageKey }) => {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as { uid?: string }).uid === expectedUid : false;
    },
    { expectedUid: profile.uid, storageKey: E2E_STORAGE_KEY },
  );
}

/** Create the account server-side, then sign the browser in as it. */
export async function seedAccount(page: Page, options: TestAccountOptions) {
  const profile = await createAccount(page, options);

  await page.goto("/");
  await signInAs(page, profile);

  return profile;
}

/** Publish an artwork for an artist account that already has a username. */
export async function seedPublishedArtwork(
  page: Page,
  options: { price?: string; title?: string; uid: string },
) {
  const response = await page.request.post("/api/test/e2e-listing", { data: options });
  expect(response.ok()).toBeTruthy();

  return (await response.json()) as { href: string; itemId: string; username: string };
}

export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==",
  "base64",
);
