/**
 * The public origin of the site, without a trailing slash. Set
 * NEXT_PUBLIC_SITE_URL in production; the fallback is the live domain so share
 * cards, the sitemap and robots.txt never point at localhost or a preview.
 * It is the www host because eduthart.com redirects there, and a redirect in
 * every shared image URL is one more thing for a link scraper to trip on.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.eduthart.com"
).replace(/\/+$/, "");
