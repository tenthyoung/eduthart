import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ContentPolicy from "@/app/legal/content-policy/page";
import PrivacyPolicy from "@/app/legal/privacy-policy/page";
import TermsOfService from "@/app/legal/terms-of-service/page";

/**
 * EduthArt grew out of a flashcard app, and its legal pages kept describing
 * that product long after the site became an art marketplace (EDUTHA-114).
 * This is the vocabulary of the old product; none of it belongs on a page a
 * collector or artist reads.
 */
const STUDY_PRODUCT_WORDING =
  /\bdecks?\b|flashcard|\bstudy\b|\bexams?\b|spaced repetition|memdojo|subscription|app store/i;

const pages = [
  {
    Page: ContentPolicy,
    linksToDmca: true,
    name: "content policy",
    title: "Content Policy",
  },
  {
    Page: PrivacyPolicy,
    linksToDmca: false,
    name: "privacy policy",
    title: "Privacy Policy",
  },
  {
    Page: TermsOfService,
    linksToDmca: true,
    name: "terms of service",
    title: "Terms of Service",
  },
];

function visibleText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

describe.each(pages)("the $name page", ({ Page, linksToDmca, title }) => {
  const html = renderToStaticMarkup(createElement(Page));
  const text = visibleText(html);

  it("describes the art marketplace rather than the old study product", () => {
    expect(text).toContain(title);
    expect(text).not.toMatch(STUDY_PRODUCT_WORDING);
    expect(text).toMatch(/\bartists?\b/i);
    expect(text).toMatch(/\bcollectors?\b/i);
    expect(text).toMatch(/\blistings?\b/i);
  });

  it("keeps the support address and the DMCA route", () => {
    expect(html).toContain('href="mailto:support@eduthart.com"');
    if (linksToDmca) {
      expect(html).toContain('href="/legal/dmca"');
    }
  });

  it("keeps the Last Updated line", () => {
    expect(text).toMatch(/Last Updated: [A-Z][a-z]+ \d{1,2}, \d{4}/);
  });
});

describe("the home page components", () => {
  it("no longer carry copy from the flashcard product", () => {
    const dir = path.join(process.cwd(), "src/components/home");
    const offenders = readdirSync(dir)
      .filter((file) => /\.tsx?$/.test(file))
      .filter((file) =>
        STUDY_PRODUCT_WORDING.test(readFileSync(path.join(dir, file), "utf8"))
      );

    expect(offenders).toEqual([]);
  });
});
