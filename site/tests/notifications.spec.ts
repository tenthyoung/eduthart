import { expect, test } from "@playwright/test";

import {
  createAccount,
  seedAccount,
  seedPublishedArtwork,
  signInAs,
} from "./support/accounts";

test("shows the username reminder until a username is chosen", async ({
  page,
}) => {
  await seedAccount(page, { uid: "notify-username-user" });

  await page.goto("/notifications");
  await expect(
    page.getByRole("heading", { name: "Choose a username" })
  ).toBeVisible();
  await expect(page.getByText("1 unread")).toBeVisible();

  await page.getByRole("button", { name: "Choose username" }).click();
  await page.getByRole("textbox", { name: "Username" }).fill("@quiet-harbour");
  await page.getByRole("button", { name: "Save username" }).click();

  await expect(page.getByText("You are all caught up")).toBeVisible();
});

test("marks a notification read and dismisses it", async ({ page }) => {
  await seedAccount(page, { uid: "notify-read-user" });

  await page.goto("/notifications");
  await expect(page.getByText("Unread", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Mark as read" }).click();
  await expect(page.getByText("Read", { exact: true })).toBeVisible();
  await expect(page.getByText("0 unread")).toBeVisible();

  await page.getByRole("button", { name: /^Dismiss/ }).click();
  await expect(page.getByText("You are all caught up")).toBeVisible();
});

test("tells followers when an artist lowers a price", async ({ page }) => {
  const artist = await createAccount(page, {
    displayName: "Marina Vale",
    uid: "artist-price-alert",
    username: "marina-price-alert",
  });
  const artwork = await seedPublishedArtwork(page, {
    price: "2400",
    uid: artist.uid,
  });
  const follower = await seedAccount(page, {
    displayName: "Sam Follower",
    uid: "collector-price-watcher",
  });

  await page.goto(`/artists/${artist.username}`);
  await page.getByRole("button", { name: "Follow artist" }).click();
  await expect(page.getByRole("button", { name: "Following" })).toBeVisible();

  // Re-publish the same listing at a lower price.
  await seedPublishedArtwork(page, {
    itemId: artwork.itemId,
    price: "1800",
    uid: artist.uid,
  });

  await signInAs(page, follower);
  await page.goto("/notifications");
  await expect(
    page.getByRole("heading", { name: 'Price drop on "Harbour Light"' })
  ).toBeVisible();
  await expect(page.getByText("from $2,400.00 to $1,800.00")).toBeVisible();
});

test("tells followers when an artist publishes new work", async ({ page }) => {
  const artist = await createAccount(page, {
    displayName: "Marina Vale",
    uid: "artist-publish-alert",
    username: "marina-publish-alert",
  });
  const follower = await seedAccount(page, {
    displayName: "Sam Follower",
    uid: "collector-follower",
  });

  await page.goto(`/artists/${artist.username}`);
  await page.getByRole("button", { name: "Follow artist" }).click();
  await expect(page.getByRole("button", { name: "Following" })).toBeVisible();

  await seedPublishedArtwork(page, { title: "Slate Morning", uid: artist.uid });

  await signInAs(page, follower);
  await page.goto("/notifications");
  await expect(
    page
      .getByRole("heading", { name: "Marina Vale published new artwork" })
      .first()
  ).toBeVisible();
});
