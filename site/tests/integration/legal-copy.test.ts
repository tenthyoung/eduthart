import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AccessibilityStatement from "@/app/legal/accessibility/page";
import ContentPolicy from "@/app/legal/content-policy/page";
import LegalIndex from "@/app/legal/page";
import PrivacyPolicy from "@/app/legal/privacy-policy/page";
import TermsOfService from "@/app/legal/terms-of-service/page";
import { SOCIAL_MEDIA_LINKS } from "@/constants/social-media.constants";

/**
 * EduthArt grew out of a flashcard app, and its legal pages kept describing
 * that product long after the site became an art marketplace (EDUTHA-114).
 * This is the vocabulary of the old product; none of it belongs on a page a
 * collector or artist reads.
 */
const STUDY_PRODUCT_WORDING =
  /\bdecks?\b|flashcard|\bstudy\b|\bexams?\b|spaced repetition|memdojo|subscription|app store|learners?\b/i;

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

/**
 * The refund and cancellation page is still written around app-store
 * subscriptions until the returns policy is decided (EDUTHA-89), and the index
 * describes it truthfully, so the index is held to the study vocabulary only.
 */
const STUDY_ONLY_WORDING =
  /\bdecks?\b|flashcard|\bstudy\b|\bexams?\b|spaced repetition|memdojo|learners?\b/i;

describe("the legal index and accessibility statement", () => {
  it.each([
    ["legal index", LegalIndex],
    ["accessibility statement", AccessibilityStatement],
  ])("the %s carries no study-product wording", (_name, Page) => {
    const text = visibleText(renderToStaticMarkup(createElement(Page)));

    expect(text).not.toMatch(STUDY_ONLY_WORDING);
  });

  it("titles the content policy the way the page itself does", () => {
    const text = visibleText(renderToStaticMarkup(createElement(LegalIndex)));

    expect(text).toContain("Content Policy");
    expect(text).not.toContain("Study Content Policy");
  });
});

describe("the social links in the header and footer", () => {
  it("point at EduthArt's own profiles, not the old app or a site's home page", () => {
    for (const href of Object.values(SOCIAL_MEDIA_LINKS)) {
      const url = new URL(href);

      expect(href).not.toMatch(/memdojo/i);
      // A bare domain is a link to the network, not to an EduthArt profile.
      expect(url.pathname.replace(/\/+$/, "")).not.toBe("");
    }
  });
});
