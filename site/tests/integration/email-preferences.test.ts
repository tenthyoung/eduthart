import { describe, expect, test } from "vitest";

import {
  GET as loadPreferencesRoute,
  PATCH as savePreferencesRoute,
} from "@/app/api/account/email-preferences/route";
import type { EmailPreferences } from "@/lib/notifications/email-categories";
import { isEmailAllowed } from "@/lib/notifications/preferences";

import { createAccount } from "./support/accounts";
import { callRoute, callRouteOk } from "./support/routes";

/**
 * Email preferences, covered at the route and the gate.
 *
 * The checkbox itself is not interesting; what matters is that a preference
 * actually reaches the one place email leaves by, and that the kinds a person
 * must not be able to silence stay unsilenceable.
 */

const PATH = "/api/account/email-preferences";

async function loadPreferences(uid: string) {
  const { preferences } = await callRouteOk<{
    preferences: EmailPreferences;
  }>(loadPreferencesRoute, { as: uid, path: PATH });

  return preferences;
}

async function savePreferences(uid: string, body: Record<string, unknown>) {
  const { preferences } = await callRouteOk<{
    preferences: EmailPreferences;
  }>(savePreferencesRoute, { as: uid, body, method: "PATCH", path: PATH });

  return preferences;
}

describe("email preferences", () => {
  test("defaults every category to on for a new account", async () => {
    const account = await createAccount({ uid: "prefs-defaults" });

    expect(await loadPreferences(account.uid)).toEqual({
      followed_artists: true,
      orders: true,
      saved_artwork: true,
      sales: true,
    });
  });

  test("changing one category leaves the others alone", async () => {
    const account = await createAccount({ uid: "prefs-partial-update" });

    const saved = await savePreferences(account.uid, {
      followed_artists: false,
    });

    expect(saved.followed_artists).toBe(false);
    expect(saved.orders).toBe(true);
    expect(saved.sales).toBe(true);
    expect(saved.saved_artwork).toBe(true);

    // And it survives a reload rather than only living in the response.
    expect(await loadPreferences(account.uid)).toEqual(saved);
  });

  test("rejects a body with no category we recognise", async () => {
    const account = await createAccount({ uid: "prefs-unknown-key" });

    const result = await callRoute<{ error?: { message?: string } }>(
      savePreferencesRoute,
      {
        as: account.uid,
        body: { marketing: false },
        method: "PATCH",
        path: PATH,
      }
    );

    expect(result.status).toBe(400);
    expect(await loadPreferences(account.uid)).toEqual({
      followed_artists: true,
      orders: true,
      saved_artwork: true,
      sales: true,
    });
  });

  test("requires a signed-in caller", async () => {
    const result = await callRoute(loadPreferencesRoute, { path: PATH });

    expect(result.status).toBe(401);
  });
});

describe("the email gate", () => {
  test("stops mail for a category the user switched off", async () => {
    const account = await createAccount({ uid: "gate-disabled-category" });

    await savePreferences(account.uid, { followed_artists: false });

    expect(
      await isEmailAllowed(account.uid, "followed_artist_price_drop")
    ).toBe(false);
    expect(await isEmailAllowed(account.uid, "followed_artist_listed")).toBe(
      false
    );

    // Switching off one category must not quieten another.
    expect(await isEmailAllowed(account.uid, "order_shipped")).toBe(true);
  });

  test("always sends security mail, whatever the preferences say", async () => {
    const account = await createAccount({ uid: "gate-security-mail" });

    await savePreferences(account.uid, {
      followed_artists: false,
      orders: false,
      sales: false,
      saved_artwork: false,
    });

    // There is deliberately no category that governs these: an account taken
    // over must still be able to tell its owner it was taken over.
    expect(await isEmailAllowed(account.uid, "password_changed")).toBe(true);
    expect(await isEmailAllowed(account.uid, "email_changed")).toBe(true);
  });

  test("allows everything for an account that never set a preference", async () => {
    const account = await createAccount({ uid: "gate-untouched-account" });

    expect(await isEmailAllowed(account.uid, "order_confirmed")).toBe(true);
    expect(await isEmailAllowed(account.uid, "artwork_sold")).toBe(true);
    expect(await isEmailAllowed(account.uid, "saved_artwork_sold")).toBe(true);
  });
});
