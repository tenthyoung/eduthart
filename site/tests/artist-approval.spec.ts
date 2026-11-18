import { expect, test } from "@playwright/test";

import { seedAccount, seedPublishedArtwork } from "./support/accounts";

/**
 * Only approved artists can list artwork (EDUTHA-137). The integration suite
 * covers the API gate; this checks what each kind of account actually sees.
 */
test("an unapproved account is sent to the artist application", async ({
  page,
}) => {
  await seedAccount(page, {
    displayName: "Nadia Brush",
    uid: "artist-unapproved",
    username: "nadia-unapproved",
  });

  await page.goto("/artists/nadia-unapproved/listings/new");

  await expect(
    page.getByRole("heading", { name: "Apply to sell your art" })
  ).toBeVisible();
  await expect(page.getByText("Listing Studio")).toHaveCount(0);

  await page.getByRole("link", { name: "Apply to be an artist" }).click();
  await expect(page).toHaveURL(/\/apply-to-be-an-artist$/);
});

test("an artist who is already selling still gets the listing studio", async ({
  page,
}) => {
  const artist = await seedAccount(page, {
    displayName: "Marina Vale",
    uid: "artist-approved-studio",
    username: "marina-approved-studio",
  });
  await seedPublishedArtwork(page, { uid: artist.uid });

  await page.goto("/artists/marina-approved-studio/listings/new");

  await expect(
    page.getByRole("heading", { name: "Apply to sell your art" })
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Orders & Payouts" }).first())
    .toBeVisible();
});
