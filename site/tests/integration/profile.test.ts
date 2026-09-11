import { describe, expect, test } from "vitest";

import {
  GET as readProfileRoute,
  PATCH as updateProfileRoute,
} from "@/app/api/auth/profile/route";
import { GET as notificationsRoute } from "@/app/api/notifications/route";
import type { AccountProfile } from "@/lib/auth/account-profile";
import type { UserNotification } from "@/lib/notifications/types";

import { createAccount } from "./support/accounts";
import { callRoute, callRouteOk } from "./support/routes";

/**
 * Editing an account profile.
 *
 * The account page's forms stay in the browser suite; what is checked here is
 * what a PATCH leaves in the store, which is where the interesting edge cases
 * live — partial updates, identity fields, and username uniqueness.
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

describe("profile edits", () => {
  test("persists a name, location, and biography", async () => {
    const collector = await createAccount({ uid: "edit-user" });

    await patchProfile(collector.uid, {
      bio: "Collecting coastal light since 2019.",
      firstName: "Avery",
      lastName: "Curator",
      location: "Brooklyn, New York",
    });

    expect(await readProfile(collector.uid)).toMatchObject({
      bio: "Collecting coastal light since 2019.",
      displayName: "Avery Curator",
      firstName: "Avery",
      lastName: "Curator",
      location: "Brooklyn, New York",
    });
  });

  test("leaves fields the edit did not mention alone", async () => {
    const collector = await createAccount({ uid: "partial-edit-user" });

    await patchProfile(collector.uid, {
      firstName: "Avery",
      lastName: "Curator",
      location: "Brooklyn, New York",
    });
    await patchProfile(collector.uid, { bio: "A short note." });

    expect(await readProfile(collector.uid)).toMatchObject({
      bio: "A short note.",
      firstName: "Avery",
      lastName: "Curator",
      location: "Brooklyn, New York",
    });
  });

  /**
   * A PATCH that recreates a deleted document used to leave it without a uid,
   * email, or providers, which broke every surface that reads them.
   */
  test("restores the identity fields on every edit", async () => {
    const collector = await createAccount({
      email: "Avery.Curator@Example.com",
      uid: "identity-user",
    });

    const profile = await patchProfile(collector.uid, { bio: "A short note." });

    expect(profile.uid).toBe("identity-user");
    expect(profile.email).toBe("avery.curator@example.com");
    expect(profile.authProviders).toEqual(["password"]);
  });

  test("clears a field when the edit sends an empty value", async () => {
    const collector = await createAccount({ uid: "clear-user" });

    await patchProfile(collector.uid, { location: "Brooklyn, New York" });
    await patchProfile(collector.uid, { location: "" });

    expect((await readProfile(collector.uid)).location).toBeNull();
  });

  test("rejects a biography over the limit and keeps the stored one", async () => {
    const collector = await createAccount({ uid: "long-bio-user" });

    await patchProfile(collector.uid, { bio: "A short note." });
    const result = await callRoute<{ error: { message: string } }>(
      updateProfileRoute,
      {
        as: collector.uid,
        body: { bio: "x".repeat(5_000) },
        method: "PATCH",
        path: "/api/auth/profile",
      }
    );

    expect(result.status).toBe(400);
    expect((await readProfile(collector.uid)).bio).toBe("A short note.");
  });
});

describe("choosing a username", () => {
  test("saves the username and clears the onboarding reminder", async () => {
    const collector = await createAccount({ uid: "username-user" });

    const before = await callRouteOk<{ notifications: UserNotification[] }>(
      notificationsRoute,
      { as: collector.uid, path: "/api/notifications" }
    );
    expect(before.notifications.map((one) => one.kind)).toEqual([
      "choose_username",
    ]);

    // The form sends what the collector typed, including the leading "@".
    await patchProfile(collector.uid, { username: "@avery-curator" });

    expect((await readProfile(collector.uid)).username).toBe("avery-curator");

    const after = await callRouteOk<{ notifications: UserNotification[] }>(
      notificationsRoute,
      { as: collector.uid, path: "/api/notifications" }
    );
    expect(after.notifications).toEqual([]);
  });

  test("refuses a username another account already holds", async () => {
    await createAccount({ uid: "username-owner", username: "maya-studio" });
    const collector = await createAccount({ uid: "username-rival" });

    const result = await callRoute<{ error: { message: string } }>(
      updateProfileRoute,
      {
        as: collector.uid,
        body: { username: "Maya-Studio" },
        method: "PATCH",
        path: "/api/auth/profile",
      }
    );

    expect(result.status).toBe(400);
    expect(result.body.error.message).toMatch(/already taken/i);
    expect((await readProfile(collector.uid)).username).toBeNull();
  });

  test("refuses a username that is too short or has stray characters", async () => {
    const collector = await createAccount({ uid: "username-invalid" });

    for (const username of ["ab", "avery curator", "avery!"]) {
      const result = await callRoute(updateProfileRoute, {
        as: collector.uid,
        body: { username },
        method: "PATCH",
        path: "/api/auth/profile",
      });

      expect(result.status, username).toBe(400);
    }

    expect((await readProfile(collector.uid)).username).toBeNull();
  });

  test("lets an account keep its own username on a later edit", async () => {
    const artist = await createAccount({
      uid: "username-keeper",
      username: "maya-studio",
    });

    const profile = await patchProfile(artist.uid, { username: "maya-studio" });

    expect(profile.username).toBe("maya-studio");
  });
});
