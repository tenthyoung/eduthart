/**
 * The EduthArt logo, defined once. Every surface that shows the logo takes
 * its look from here: the site header and footer, the workspace and admin
 * sidebars (components/brand-mark.tsx), the favicon, home-screen icon and
 * share card (app/icon.tsx, app/apple-icon.tsx, app/opengraph-image.tsx), and
 * the emails, invoice and certificate (`brandLogoHtml` below).
 *
 * The logo is a lockup of two parts:
 * - the mark: the brushstroke E, ink with a gold middle stroke. Its artwork is
 *   public/brand/eduthart-mark.svg, mirrored in lib/brand/mark-svg.ts.
 * - the text logo: "eduthart", always lowercase, bold, tracked tight.
 *
 * Kept free of the mark's artwork so client components can import it cheaply.
 */

/** The company's name, as written in sentences. */
export const BRAND_NAME = "EduthArt";

/** The text logo. Always lowercase; never write it out by hand. */
export const BRAND_WORDMARK = "eduthart";

/** Width over height of the mark's artwork, cropped tight to its strokes. */
export const BRAND_MARK_ASPECT = 351 / 359;

/** The logo's colours: ink strokes with a gold middle stroke ("Ink, gold middle"). */
export const BRAND_MARK_INK = "#1f1f1f";
export const BRAND_MARK_GOLD = "#c9a35c";
/** The middle stroke on the dark theme, lifted so it holds up on near-black. */
export const BRAND_MARK_GOLD_DARK = "#d4af7c";

/**
 * The lockup's proportions, in ems of the text logo's font size, so the logo
 * keeps its shape at any size. At the header's 24px text: a 32px mark, 8px gap.
 */
export const BRAND_LOCKUP = {
  markHeightEm: 4 / 3,
  gapEm: 1 / 3,
  wordmarkWeight: 700,
  wordmarkTrackingEm: -0.03,
} as const;

/** The text logo's face, for surfaces outside the site (emails, documents). */
export const BRAND_WORDMARK_FONT_STACK =
  "'Inter Tight', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

/**
 * The lockup as HTML with inline styles, for emails and the printable invoice
 * and certificate. Built from a table so email clients lay it out too.
 *
 * `markSrc` is the mark image: an absolute URL to /brand/mark.png for email
 * (clients block data URLs), or `brandMarkTwoToneDataUrl()` for documents
 * that must stand on their own once downloaded.
 */
export function brandLogoHtml({
  markSrc,
  fontSize = 20,
  color = BRAND_MARK_INK,
}: {
  markSrc: string;
  fontSize?: number;
  color?: string;
}) {
  const markHeight = Math.round(fontSize * BRAND_LOCKUP.markHeightEm);
  const markWidth = Math.round(markHeight * BRAND_MARK_ASPECT);
  const gap = Math.round(fontSize * BRAND_LOCKUP.gapEm);

  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">` +
    `<tr>` +
    `<td style="padding:0 ${gap}px 0 0;vertical-align:middle">` +
    `<img src="${markSrc}" width="${markWidth}" height="${markHeight}" alt="" style="border:0;display:block" />` +
    `</td>` +
    `<td style="color:${color};font-family:${BRAND_WORDMARK_FONT_STACK};font-size:${fontSize}px;font-weight:${BRAND_LOCKUP.wordmarkWeight};letter-spacing:${BRAND_LOCKUP.wordmarkTrackingEm}em;line-height:1;vertical-align:middle">` +
    BRAND_WORDMARK +
    `</td>` +
    `</tr>` +
    `</table>`
  );
}
