/**
 * The public origin of the site, without a trailing slash. Set
 * NEXT_PUBLIC_SITE_URL in production; the fallback is the live domain so share
 * cards, the sitemap and robots.txt never point at localhost or a preview.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://eduthart.com"
).replace(/\/+$/, "");
