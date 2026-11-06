import { describe, expect, test } from "vitest";

import {
  GET as loadPreferencesRoute,
  PATCH as savePreferencesRoute,
} from "@/app/api/account/email-preferences/route";
import type { NotificationSettings } from "@/lib/notifications/email-categories";
import { POST as newsletterSignupRoute } from "@/app/api/zoho-campaigns/route";
import { COLLECTOR_LIST_KEY } from "@/constants/newsletter.constants";
import { isEmailAllowed } from "@/lib/notifications/preferences";

import { createAccount } from "./support/accounts";
import { callRoute, callRouteOk } from "./support/routes";

/**
 * Notification settings, covered at the route and the gate.
 *
 * The checkboxes are not interesting; what matters is that a setting reaches
 * the one place email leaves by, that a category and a per-kind override
 * resolve in the right order, and that the kinds nobody may silence stay
 * unsilenceable.
 */

const PATH = "/api/account/email-preferences";

const ALL_ON = {
  followed_artists: true,
  orders: true,
  saved_artwork: true,
  sales: true,
};

async function loadSettings(uid: string) {
  const { settings } = await callRouteOk<{ settings: NotificationSettings }>(
    loadPreferencesRoute,
    { as: uid, path: PATH }
  );

  return settings;
}

async function saveSettings(uid: string, body: Record<string, unknown>) {
  const { settings } = await callRouteOk<{ settings: NotificationSettings }>(
    savePreferencesRoute,
    { as: uid, body, method: "PATCH", path: PATH }
  );

  return settings;
}

describe("notification settings", () => {
  test("defaults every category to on, with no per-kind overrides", async () => {
    const account = await createAccount({ uid: "prefs-defaults" });

    expect(await loadSettings(account.uid)).toEqual({
      categories: ALL_ON,
      kinds: {},
      marketing: false,
    });
  });

  test("changing one category leaves the others alone", async () => {
    const account = await createAccount({ uid: "prefs-partial-update" });

    const saved = await saveSettings(account.uid, {
      categories: { followed_artists: false },
    });

    expect(saved.categories.followed_artists).toBe(false);
    expect(saved.categories.orders).toBe(true);
    expect(saved.categories.sales).toBe(true);
    expect(saved.categories.saved_artwork).toBe(true);

    // And it survives a reload rather than only living in the response.
    expect(await loadSettings(account.uid)).toEqual(saved);
  });

  test("records a per-kind override without touching its category", async () => {
    const account = await createAccount({ uid: "prefs-kind-override" });

    const saved = await saveSettings(account.uid, {
      kinds: { order_shipped: false },
    });

    expect(saved.kinds).toEqual({ order_shipped: false });
    expect(saved.categories.orders).toBe(true);
    expect(await loadSettings(account.uid)).toEqual(saved);
  });

  test("moving a category clears the overrides beneath it", async () => {
    const account = await createAccount({ uid: "prefs-category-clears-kinds" });

    await saveSettings(account.uid, {
      kinds: { order_delivered: false, order_shipped: false },
    });

    // Switching the whole category off and back on should leave nothing
    // lingering underneath, or the category control would look broken.
    await saveSettings(account.uid, { categories: { orders: false } });
    const reset = await saveSettings(account.uid, {
      categories: { orders: true },
    });

    expect(reset.kinds.order_shipped).toBeUndefined();
    expect(reset.kinds.order_delivered).toBeUndefined();
    expect(await isEmailAllowed(account.uid, "order_shipped")).toBe(true);
  });

  test("an override in one category does not disturb another", async () => {
    const account = await createAccount({ uid: "prefs-cross-category" });

    await saveSettings(account.uid, { kinds: { order_shipped: false } });
    const saved = await saveSettings(account.uid, {
      categories: { followed_artists: false },
    });

    expect(saved.kinds.order_shipped).toBe(false);
    expect(saved.categories.followed_artists).toBe(false);
  });

  test("rejects a body with nothing we recognise", async () => {
    const account = await createAccount({ uid: "prefs-unknown-key" });

    const result = await callRoute(savePreferencesRoute, {
      as: account.uid,
      body: { categories: { marketing: false }, kinds: { nonsense: true } },
      method: "PATCH",
      path: PATH,
    });

    expect(result.status).toBe(400);
    expect(await loadSettings(account.uid)).toEqual({
      categories: ALL_ON,
      kinds: {},
      marketing: false,
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

    await saveSettings(account.uid, {
      categories: { followed_artists: false },
    });

    expect(
      await isEmailAllowed(account.uid, "followed_artist_price_drop")
    ).toBe(false);
    expect(await isEmailAllowed(account.uid, "followed_artist_listed")).toBe(
      false
    );

    // Switching off one category must not quieten another.
    expect(await isEmailAllowed(account.uid, "order_shipped")).toBe(true);
  });

  test("a per-kind override beats its category, in both directions", async () => {
    const account = await createAccount({ uid: "gate-override-wins" });

    // Off within a category that is on.
    await saveSettings(account.uid, { kinds: { order_shipped: false } });

    expect(await isEmailAllowed(account.uid, "order_shipped")).toBe(false);
    expect(await isEmailAllowed(account.uid, "order_confirmed")).toBe(true);

    // On within a category that is off — the case that makes this worth
    // having: keep the price drops, drop everything else from follows.
    await saveSettings(account.uid, {
      categories: { followed_artists: false },
    });
    await saveSettings(account.uid, {
      kinds: { followed_artist_price_drop: true },
    });

    expect(
      await isEmailAllowed(account.uid, "followed_artist_price_drop")
    ).toBe(true);
    expect(await isEmailAllowed(account.uid, "followed_artist_listed")).toBe(
      false
    );
  });

  test("always sends security mail, whatever the settings say", async () => {
    const account = await createAccount({ uid: "gate-security-mail" });

    await saveSettings(account.uid, {
      categories: {
        followed_artists: false,
        orders: false,
        sales: false,
        saved_artwork: false,
      },
    });

    // There is deliberately no category or kind that governs these: an account
    // taken over must still be able to tell its owner it was taken over.
    expect(await isEmailAllowed(account.uid, "password_changed")).toBe(true);
    expect(await isEmailAllowed(account.uid, "email_changed")).toBe(true);
  });

  test("allows everything for an account that never set anything", async () => {
    const account = await createAccount({ uid: "gate-untouched-account" });

    expect(await isEmailAllowed(account.uid, "order_confirmed")).toBe(true);
    expect(await isEmailAllowed(account.uid, "artwork_sold")).toBe(true);
    expect(await isEmailAllowed(account.uid, "saved_artwork_sold")).toBe(true);
  });
});

/**
 * The newsletter is the one opt-in setting, and the only one that lives in
 * someone else's system. What matters: it starts off, the account and the
 * footer signup agree, and a Zoho failure never leaves the account claiming a
 * state the list does not have.
 */
describe("marketing emails", () => {
  test("start switched off", async () => {
    const account = await createAccount({ uid: "marketing-default" });

    expect((await loadSettings(account.uid)).marketing).toBe(false);
  });

  test("switch on and off from the account, and survive a reload", async () => {
    const account = await createAccount({ uid: "marketing-toggle" });

    expect(
      (await saveSettings(account.uid, { marketing: true })).marketing
    ).toBe(true);
    expect((await loadSettings(account.uid)).marketing).toBe(true);

    expect(
      (await saveSettings(account.uid, { marketing: false })).marketing
    ).toBe(false);
    expect((await loadSettings(account.uid)).marketing).toBe(false);
  });

  test("leave the activity settings alone", async () => {
    const account = await createAccount({ uid: "marketing-independent" });

    await saveSettings(account.uid, { categories: { orders: false } });
    const saved = await saveSettings(account.uid, { marketing: true });

    expect(saved.categories.orders).toBe(false);
    expect(saved.categories.sales).toBe(true);
    expect(await isEmailAllowed(account.uid, "order_confirmed")).toBe(false);
  });

  test("stay as they were when Zoho refuses the change", async () => {
    const account = await createAccount({
      email: "collector+zoho-fails@example.com",
      uid: "marketing-zoho-down",
    });

    const result = await callRoute(savePreferencesRoute, {
      as: account.uid,
      body: { marketing: true },
      method: "PATCH",
      path: PATH,
    });

    expect(result.status).toBe(502);
    expect((await loadSettings(account.uid)).marketing).toBe(false);
  });

  test("are changed on their own, not bundled with other settings", async () => {
    const account = await createAccount({ uid: "marketing-bundled" });

    const result = await callRoute(savePreferencesRoute, {
      as: account.uid,
      body: { categories: { orders: false }, marketing: true },
      method: "PATCH",
      path: PATH,
    });

    expect(result.status).toBe(400);
    expect(await loadSettings(account.uid)).toEqual({
      categories: ALL_ON,
      kinds: {},
      marketing: false,
    });
  });

  test("switch on when the owner signs up in the footer with their own address", async () => {
    const account = await createAccount({
      email: "Footer.Collector@example.com",
      uid: "marketing-footer-own",
    });

    await callRouteOk(newsletterSignupRoute, {
      as: account.uid,
      body: {
        emails: ["footer.collector@example.com"],
        listKey: COLLECTOR_LIST_KEY,
      },
      path: "/api/zoho-campaigns",
    });

    expect((await loadSettings(account.uid)).marketing).toBe(true);
  });

  test("stay off when a signed-in person subscribes someone else", async () => {
    const account = await createAccount({ uid: "marketing-footer-other" });

    await callRouteOk(newsletterSignupRoute, {
      as: account.uid,
      body: { emails: ["a.friend@example.com"], listKey: COLLECTOR_LIST_KEY },
      path: "/api/zoho-campaigns",
    });

    expect((await loadSettings(account.uid)).marketing).toBe(false);
  });

  test("let a signed-out visitor sign up as before", async () => {
    const result = await callRoute(newsletterSignupRoute, {
      body: { emails: ["visitor@example.com"], listKey: COLLECTOR_LIST_KEY },
      path: "/api/zoho-campaigns",
    });

    expect(result.status).toBe(200);
  });
});
