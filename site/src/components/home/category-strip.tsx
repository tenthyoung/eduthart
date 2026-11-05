import Link from "next/link";

import { buildBrowseHref } from "@/lib/artists/artwork-search";
import { SHOP_CATEGORIES } from "@/lib/navigation";

/**
 * The home page's row of shopping shortcuts, just under the header.
 *
 * It lives on the page rather than in the fixed header so the header keeps one
 * height everywhere; it scrolls away with the hero once someone is browsing.
 */
export function CategoryStrip() {
  return (
    <nav aria-label="Shop by category" className="border-b border-border">
      {/* Swipes sideways on a phone; the bar is hidden because the cut-off last label already says "more". */}
      <div className="mx-auto flex h-11 max-w-7xl items-center gap-6 overflow-x-auto px-4 text-sm whitespace-nowrap text-muted-foreground [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
        {SHOP_CATEGORIES.map((category) => (
          <Link
            className="transition-colors hover:text-foreground"
            href={buildBrowseHref({ category: category.value })}
            key={category.value}
          >
            {category.label}
          </Link>
        ))}
        <span className="ml-auto flex gap-6">
          <Link
            className="transition-colors hover:text-foreground"
            href={buildBrowseHref({ budget: "under-1000" })}
          >
            Under $1,000
          </Link>
          <Link
            className="transition-colors hover:text-foreground"
            href="/browse"
          >
            All originals
          </Link>
        </span>
      </div>
    </nav>
  );
}
