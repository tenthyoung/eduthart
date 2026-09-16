import { describe, expect, it } from "vitest";
import { AVATAR_PALETTES, initialsFor, paletteFor } from "@/lib/profile/avatar";

describe("initialsFor", () => {
  it("handles the shapes real accounts arrive in", () => {
    expect(initialsFor("Izzy Young")).toBe("IY");
    expect(initialsFor("izzy young")).toBe("IY");
    expect(initialsFor("Mary Jane Watson")).toBe("MW"); // first + last, not middle
    expect(initialsFor("Prince")).toBe("P");
    expect(initialsFor("  Izzy   Young  ")).toBe("IY"); // stray whitespace
    expect(initialsFor(null, "izzy@hendecalabs.com")).toBe("I");
    expect(initialsFor("", "izzy@hendecalabs.com")).toBe("I");
    expect(initialsFor("José Álvarez")).toBe("JÁ"); // accents survive
    expect(initialsFor("李 明")).toBe("李明"); // non-latin
  });

  it("returns empty rather than a meaningless glyph-initial", () => {
    expect(initialsFor(null, null)).toBe("");
    expect(initialsFor("   ")).toBe("");
    expect(initialsFor("🎨")).toBe("");
    expect(initialsFor("---")).toBe("");
  });
});

describe("paletteFor", () => {
  it("is stable for the same seed", () => {
    expect(paletteFor("e2e-izzy")).toBe(paletteFor("e2e-izzy"));
  });

  it("always returns a real palette, including for the empty seed", () => {
    for (const seed of ["", "a", "e2e-izzy", "x".repeat(300), "🎨"]) {
      expect(AVATAR_PALETTES).toContain(paletteFor(seed));
    }
  });

  it("spreads uids across all six colours", () => {
    const seen = new Set(
      Array.from({ length: 400 }, (_, i) => paletteFor(`uid-${i}`))
    );
    expect(seen.size).toBe(AVATAR_PALETTES.length);
  });
});
