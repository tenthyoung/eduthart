import { describe, expect, test } from "vitest";

import { listIndexedArtworks } from "@/lib/artists/artwork-index";
import {
  parseArtworkSearchFilters,
  searchArtworks,
  summarizeCategories,
} from "@/lib/artists/artwork-search";

import { createAccount, publishArtwork } from "./support/accounts";

/**
 * Browse and search, run against the real artwork index.
 *
 * The browse page is `parseArtworkSearchFilters` then `searchArtworks` over
 * `listIndexedArtworks`, so driving those three with artwork published through
 * the same index sync a listing uses covers the filtering the page shows. What
 * is left for the browser suite is the wiring — that the hero's search box and
 * the category tiles build the query string these functions read.
 */

/** Publish one original under an artist created for this case. */
async function seedArtwork(options: {
  category?: string;
  price?: string;
  suffix: string;
  tags?: string[];
  title: string;
}) {
  const artist = await createAccount({
    displayName: "Marina Vale",
    uid: `discovery-artist-${options.suffix}`,
    username: `discovery-${options.suffix}`,
  });

  return publishArtwork({
    category: options.category,
    price: options.price,
    tags: options.tags,
    title: options.title,
    uid: artist.uid,
  });
}

/** The titles the browse page would render for a query string. */
async function browse(query: string) {
  const filters = parseArtworkSearchFilters(
    Object.fromEntries(new URLSearchParams(query))
  );

  return searchArtworks(await listIndexedArtworks(), filters).map(
    (artwork) => artwork.title
  );
}

describe("browsing available art", () => {
  test("lists everything for sale and counts its categories", async () => {
    await seedArtwork({
      category: "Painting",
      suffix: "home-painting",
      title: "Tidewater Morning",
    });
    await seedArtwork({
      category: "Sculpture",
      suffix: "home-sculpture",
      title: "Basalt Column",
    });

    // Seeded in the same millisecond, so the newest-first order is a coin flip.
    expect((await browse("")).sort()).toEqual([
      "Basalt Column",
      "Tidewater Morning",
    ]);

    const categories = summarizeCategories(await listIndexedArtworks());

    expect(categories).toEqual(
      expect.arrayContaining([
        { count: 1, href: "/browse?category=Painting", name: "Painting" },
        { count: 1, href: "/browse?category=Sculpture", name: "Sculpture" },
      ])
    );
    expect(categories).toHaveLength(2);
  });

  test("a category filter narrows the gallery to that category", async () => {
    await seedArtwork({
      category: "Painting",
      suffix: "cat-painting",
      title: "Tidewater Morning",
    });
    await seedArtwork({
      category: "Sculpture",
      suffix: "cat-sculpture",
      title: "Basalt Column",
    });

    expect(await browse("category=Sculpture")).toEqual(["Basalt Column"]);
  });

  test("a search returns the matching artwork and nothing else", async () => {
    await seedArtwork({ suffix: "search-match", title: "Marsh Lantern" });
    await seedArtwork({ suffix: "search-miss", title: "Quarry Steps" });

    expect(await browse("q=marsh+lantern")).toEqual(["Marsh Lantern"]);
  });

  test("every term has to match, so extra words narrow the results", async () => {
    await seedArtwork({ suffix: "narrow-a", title: "Marsh Lantern" });
    await seedArtwork({ suffix: "narrow-b", title: "Marsh Steps" });

    expect(await browse("q=marsh")).toHaveLength(2);
    expect(await browse("q=marsh+lantern")).toEqual(["Marsh Lantern"]);
  });

  test("a search that matches nothing comes back empty", async () => {
    await seedArtwork({ suffix: "search-empty", title: "Copper Hollow" });

    expect(await browse("q=nothing+matches+this")).toEqual([]);
    // And the way back out of the empty state still shows the artwork.
    expect(await browse("")).toEqual(["Copper Hollow"]);
  });

  test("the budget filter keeps only artwork inside the band", async () => {
    await seedArtwork({
      price: "400",
      suffix: "budget-low",
      title: "Small Study In Grey",
    });
    await seedArtwork({
      price: "8200",
      suffix: "budget-high",
      title: "Large Study In Grey",
    });

    expect(await browse("q=study+in+grey&budget=under-500")).toEqual([
      "Small Study In Grey",
    ]);
    expect(await browse("q=study+in+grey&budget=collector")).toEqual([
      "Large Study In Grey",
    ]);
  });

  test("a filter value that is not offered is ignored rather than matching nothing", async () => {
    await seedArtwork({ suffix: "bad-filter", title: "Copper Hollow" });

    expect(await browse("category=Nonsense&budget=made-up")).toEqual([
      "Copper Hollow",
    ]);
  });
});
