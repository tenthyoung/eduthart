import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { summarizeTrendingArtists } from "@/components/home/home-data";
import type { IndexedArtwork } from "@/lib/artists/artwork-index";
import {
  BRAND_MARK_GOLD,
  BRAND_MARK_GOLD_DARK,
  BRAND_WORDMARK,
  brandLogoHtml,
} from "@/lib/brand/logo";
import { BRAND_MARK_SVG, brandMarkDataUrl } from "@/lib/brand/mark-svg";

describe("the brand mark", () => {
  it("embeds exactly the SVG the site masks with", () => {
    const publicSvg = readFileSync(
      path.join(process.cwd(), "public/brand/eduthart-mark.svg"),
      "utf8"
    );

    expect(BRAND_MARK_SVG).toBe(publicSvg);
  });

  it("recolours every stroke and fill for the generated icons", () => {
    const encoded = brandMarkDataUrl("#1f1f1f").split(",")[1];
    const svg = Buffer.from(encoded, "base64").toString("utf8");

    expect(svg).not.toContain("#000");
    expect(svg).toContain("#1f1f1f");
  });

  it("uses the same gold on the site as in the generated icons", () => {
    const css = readFileSync(
      path.join(process.cwd(), "src/app/globals.css"),
      "utf8"
    );
    const golds = [...css.matchAll(/--mark-mid:\s*(#[0-9a-f]{6})/gi)].map(
      (match) => match[1].toLowerCase()
    );

    expect(golds).toEqual([BRAND_MARK_GOLD, BRAND_MARK_GOLD_DARK]);
  });
});

describe("the logo", () => {
  it("draws the mark and the text logo for emails and documents", () => {
    const html = brandLogoHtml({ markSrc: "https://example.com/mark.png" });

    expect(html).toContain('src="https://example.com/mark.png"');
    expect(html).toContain(`>${BRAND_WORDMARK}</td>`);
  });

  it("is never written out by hand outside lib/brand", () => {
    const root = path.join(process.cwd(), "src");
    const files = readdirSync(root, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
      .map((entry) => path.join(entry.parentPath, entry.name))
      .filter(
        (file) => !file.includes(`${path.sep}lib${path.sep}brand${path.sep}`)
      );

    // An element whose whole text is the lowercase text logo is a hand-made
    // copy of the logo: render BrandLogo or brandLogoHtml instead.
    const handMade = files.filter((file) =>
      />\s*eduthart\s*</.test(readFileSync(file, "utf8"))
    );

    expect(handMade).toEqual([]);
  });
});

function artwork(overrides: Partial<IndexedArtwork>): IndexedArtwork {
  return {
    artistName: "Artist",
    artistUid: "uid",
    artistUsername: "artist",
    availability: "original_available",
    category: "Painting",
    currency: "USD",
    href: "/artists/artist/art/x",
    imageUrl: null,
    itemId: "x",
    key: "x",
    medium: "Oil",
    priceMinor: 10_000,
    style: "",
    subject: "",
    tags: [],
    title: "Untitled",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("summarizeTrendingArtists", () => {
  it("ranks by works for sale, breaks ties by newest, and shows the newest piece", () => {
    const available = [
      artwork({
        artistUid: "a",
        artistUsername: "a",
        artistName: "A",
        imageUrl: "a-old",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
      artwork({
        artistUid: "a",
        artistUsername: "a",
        artistName: "A",
        imageUrl: "a-new",
        updatedAt: "2026-03-01T00:00:00.000Z",
      }),
      artwork({
        artistUid: "b",
        artistUsername: "b",
        artistName: "B",
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
      artwork({
        artistUid: "c",
        artistUsername: "c",
        artistName: "C",
        updatedAt: "2026-04-01T00:00:00.000Z",
      }),
      artwork({ artistUid: "d", artistUsername: "", artistName: "No profile" }),
    ];

    const trending = summarizeTrendingArtists(available, 3);

    expect(trending.map((artist) => artist.artistUid)).toEqual(["a", "c", "b"]);
    expect(trending[0]).toMatchObject({ count: 2, coverUrl: "a-new" });
  });
});
