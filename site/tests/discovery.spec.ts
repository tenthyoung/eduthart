import { expect, test } from "@playwright/test";

import { createAccount, seedPublishedArtwork } from "./support/accounts";

/**
 * What the browser has to get right about discovery: the hero's controls build
 * the query string, and the browse page renders what comes back for it.
 *
 * Which artwork a given query, category, or budget actually matches is settled
 * in tests/integration/discovery.test.ts, against the same index this page
 * reads. Re-checking each filter through a page load only bought slower proof
 * of the same thing.
 */

/** Publish one original for an artist created just for this test. */
async function seedArtwork(
  page: import("@playwright/test").Page,
  options: { category?: string; price?: string; suffix: string; title: string }
) {
  const artist = await createAccount(page, {
    displayName: "Marina Vale",
    uid: `discovery-artist-${options.suffix}`,
    username: `discovery-${options.suffix}`,
  });

  return seedPublishedArtwork(page, {
    category: options.category,
    price: options.price,
    title: options.title,
    uid: artist.uid,
  });
}

test("the homepage shows available art and its categories", async ({
  page,
}) => {
  await seedArtwork(page, {
    category: "Painting",
    suffix: "home-painting",
    title: "Tidewater Morning",
  });
  await seedArtwork(page, {
    category: "Sculpture",
    suffix: "home-sculpture",
    title: "Basalt Column",
  });

  await page.goto("/");

  // The artwork itself, not a placeholder describing it. The newest pieces
  // appear twice (New works and the budget shelf), so look in the first.
  const newWorks = page.getByRole("region", { name: "New works" });
  await expect(
    newWorks.getByRole("link", { name: "Tidewater Morning" })
  ).toBeVisible();
  await expect(
    newWorks.getByRole("link", { name: "Basalt Column" })
  ).toBeVisible();

  // The artists behind them can be followed from the homepage.
  await expect(
    page
      .getByRole("region", { name: "Trending artists" })
      .getByRole("button", { name: /^Follow / })
      .first()
  ).toBeVisible();

  const categories = page.getByRole("navigation", {
    name: "Browse by category",
  });
  await expect(
    categories.getByRole("link", { name: "Painting artwork" })
  ).toBeVisible();

  // A category tile narrows the gallery to that category.
  await categories.getByRole("link", { name: "Sculpture artwork" }).click();
  await expect(page).toHaveURL(/\/browse\?category=Sculpture/);
  await expect(page.getByRole("link", { name: "Basalt Column" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Tidewater Morning" })
  ).toBeHidden();
});

test("the header's search box runs a search from any page", async ({
  page,
}) => {
  await seedArtwork(page, {
    suffix: "header-search",
    title: "Lantern Field",
  });

  await page.goto("/");
  const search = page.getByLabel("Search artists and artworks");
  await search.fill("lantern field");
  await search.press("Enter");

  await expect(page).toHaveURL(/\/browse\?q=lantern\+field/);
  await expect(page.getByRole("link", { name: "Lantern Field" })).toBeVisible();
});

test("the browse page's search box and budget filter build the query", async ({
  page,
}) => {
  await seedArtwork(page, {
    price: "400",
    suffix: "search-match",
    title: "Marsh Lantern",
  });
  await seedArtwork(page, {
    price: "8200",
    suffix: "search-miss",
    title: "Quarry Steps",
  });

  await page.goto("/browse");
  await page.getByLabel("Search artwork").fill("marsh lantern");
  await page.getByLabel("Budget").click();
  await page.getByRole("option", { name: "Under $500" }).click();
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(/\/browse\?q=marsh\+lantern&budget=under-500/);
  await expect(page.getByRole("link", { name: "Marsh Lantern" })).toBeVisible();
  await expect(page.getByText("1 artwork for “marsh lantern”")).toBeVisible();
});

test("a search that matches nothing explains itself and offers a way back", async ({
  page,
}) => {
  await seedArtwork(page, {
    suffix: "search-empty",
    title: "Copper Hollow",
  });

  await page.goto("/browse");
  await page.getByLabel("Search artwork").fill("nothing matches this");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page.getByText("No artwork found")).toBeVisible();
  await expect(page.getByText("Try fewer words")).toBeVisible();

  await page.getByRole("link", { name: "See all available art" }).click();
  await expect(page).toHaveURL("/browse");
  await expect(page.getByRole("link", { name: "Copper Hollow" })).toBeVisible();
});
