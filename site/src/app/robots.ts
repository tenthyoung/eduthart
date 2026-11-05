import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-url";

/**
 * Everything public is crawlable; the signed-in, admin, checkout and
 * artist-management areas are not. Disallowing a path stops crawling but does
 * not hide a page, so none of these are relied on for privacy.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account",
        "/admin",
        "/api/",
        "/auth/",
        "/cart",
        "/checkout",
        "/collections/",
        "/compare",
        "/forgot-password",
        "/login",
        "/notifications",
        "/signup",
        "/test-content-report",
        "/welcome",
        "/artists/*/listings/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
