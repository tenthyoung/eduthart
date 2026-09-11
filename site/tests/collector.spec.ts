import { expect, test } from "@playwright/test";

import {
  createAccount,
  seedAccount,
  seedPublishedArtwork,
} from "./support/accounts";

/** An artist with one published original, plus a signed-in collector. */
async function seedGallery(
  page: import("@playwright/test").Page,
  suffix: string
) {
  const artist = await createAccount(page, {
    displayName: "Marina Vale",
    uid: `artist-${suffix}`,
    username: `marina-${suffix}`,
  });
  const artwork = await seedPublishedArtwork(page, { uid: artist.uid });
  const collector = await seedAccount(page, {
    displayName: "Robin Buyer",
    uid: `collector-${suffix}`,
  });

  return { artist, artwork, collector };
}

test("saves an artwork, organizes it into a collection, and shares the collection", async ({
  page,
}) => {
  const { artwork } = await seedGallery(page, "collect");

  await page.goto(artwork.href);
  await page.getByRole("button", { name: "Save to favorites" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();

  await page.goto("/account/favorites");
  await expect(page.getByRole("link", { name: "Harbour Light" })).toBeVisible();

  await page.getByRole("button", { name: "Add to collection" }).click();
  await page.getByLabel("New collection").fill("Coastal light");
  await page.getByRole("button", { name: "Create and add" }).click();
  await expect(page.getByText("Added to your collection.")).toBeVisible();

  await page.goto("/account/collections");
  await expect(
    page.getByRole("heading", { name: "Coastal light" })
  ).toBeVisible();
  await expect(page.getByText("1 artwork")).toBeVisible();

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(
    page.getByText("Anyone with the link can view it.")
  ).toBeVisible();

  const shareHref = await page
    .getByRole("link", { name: /^\/collections\// })
    .getAttribute("href");
  expect(shareHref).toBeTruthy();

  // A signed-out visitor can open the share link.
  await page.evaluate(() => window.localStorage.clear());
  await page.goto(shareHref!);
  await expect(
    page.getByRole("heading", { name: "Coastal light" })
  ).toBeVisible();
  await expect(page.getByText("Curated by Robin Buyer")).toBeVisible();
});

test("renames and deletes a collection", async ({ page }) => {
  await seedAccount(page, { uid: "collections-user" });

  await page.goto("/account/collections");
  await page.getByLabel("New collection").fill("First draft");
  await page.getByRole("button", { name: "Create collection" }).click();
  await expect(
    page.getByRole("heading", { name: "First draft" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Rename" }).click();
  await page.getByLabel("Collection name").fill("Studio wall");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: "Studio wall" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No collections yet")).toBeVisible();
});

test("follows and unfollows an artist", async ({ page }) => {
  const { artwork } = await seedGallery(page, "follow");

  await page.goto(`/artists/${artwork.username}`);
  await page.getByRole("button", { name: "Follow artist" }).click();
  await expect(page.getByRole("button", { name: "Following" })).toBeVisible();

  await page.goto("/account/following");
  await expect(page.getByRole("link", { name: "Marina Vale" })).toBeVisible();

  await page.getByRole("button", { name: "Unfollow" }).click();
  await expect(
    page.getByText("You are not following anyone yet")
  ).toBeVisible();
});

test("records recently viewed artwork and can clear the history", async ({
  page,
}) => {
  const { artwork } = await seedGallery(page, "history");

  // The view is recorded from the client, so let it land before navigating.
  const recorded = page.waitForResponse(
    (response) =>
      response.url().includes("/api/collectors/recently-viewed") &&
      response.request().method() === "POST"
  );
  await page.goto(artwork.href);
  await expect(
    page.getByRole("heading", { name: "Harbour Light" })
  ).toBeVisible();
  await recorded;

  await page.goto("/account/recently-viewed");
  await expect(page.getByRole("link", { name: "Harbour Light" })).toBeVisible();

  await page.getByRole("button", { name: "Clear history" }).click();
  await expect(page.getByText("Nothing viewed yet")).toBeVisible();
});

test("compares two artworks side by side", async ({ page }) => {
  const first = await createAccount(page, {
    displayName: "Marina Vale",
    uid: "artist-compare-a",
    username: "marina-compare-a",
  });
  const second = await createAccount(page, {
    displayName: "Tomas Reed",
    uid: "artist-compare-b",
    username: "tomas-compare-b",
  });
  const artworkA = await seedPublishedArtwork(page, {
    title: "Harbour Light",
    uid: first.uid,
  });
  const artworkB = await seedPublishedArtwork(page, {
    price: "980",
    title: "Quarry Dusk",
    uid: second.uid,
  });
  await seedAccount(page, { uid: "collector-compare" });

  await page.goto(artworkA.href);
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await page.goto(artworkB.href);
  await page.getByRole("button", { name: "Compare", exact: true }).click();

  await page.goto("/compare");
  await expect(
    page.getByRole("columnheader", { name: /Harbour Light/ })
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: /Quarry Dusk/ })
  ).toBeVisible();
  await expect(page.getByText("$2,400.00")).toBeVisible();
  await expect(page.getByText("$980.00")).toBeVisible();
});
