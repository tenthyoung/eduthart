import Link from "next/link";
import { Suspense } from "react";

import { CategoryStrip } from "@/components/home/category-strip";
import {
  FeaturedArtwork,
  FeaturedArtworkSkeleton,
} from "@/components/home/featured-artwork";
import { Button } from "@/components/ui/button";
import {
  buildBrowseHref,
  type ArtworkSearchFilters,
} from "@/lib/artists/artwork-search";

/**
 * Starting points that run a real search rather than only filling the box.
 *
 * They are links so the destination is visible before the click and so each
 * one is shareable, which a button that only seeded the input never was.
 */
const quickSearchLinks: {
  filters: Partial<ArtworkSearchFilters>;
  label: string;
}[] = [
  { filters: { query: "abstract" }, label: "Abstract" },
  { filters: { query: "landscape" }, label: "Landscapes" },
  { filters: { category: "Photography" }, label: "Photography" },
  { filters: { budget: "under-500" }, label: "Under $500" },
];

export function HomeHero() {
  return (
    // The header is fixed at h-16, so the page starts below it.
    <div className="pt-16">
      <CategoryStrip />
      <section className="mx-auto grid w-full max-w-7xl items-end gap-10 px-4 pt-10 pb-10 sm:px-6 lg:grid-cols-[5fr_7fr] lg:gap-12 lg:px-8 lg:pt-12 lg:pb-14">
        {/* `rise-in` staggers the lines in with CSS alone, so the words are
            never held back waiting for the page's JavaScript. */}
        <div className="rise-in flex flex-col gap-5">
          <span className="text-[13px] font-semibold tracking-[0.04em] text-foreground uppercase">
            Original art, signed by the artist
          </span>
          <h1 className="text-[2.75rem] leading-[0.98] font-semibold tracking-[-0.045em] text-foreground sm:text-6xl lg:text-[4rem]">
            Find a piece you&rsquo;ll love living with.
          </h1>
          <p className="max-w-md text-lg leading-7 text-muted-foreground">
            Every piece is an original, signed by the artist who made it and
            shipped from their studio.
          </p>
          <div className="mt-1 flex flex-wrap gap-3">
            <Button asChild className="rounded-full" size="lg">
              <Link href="/browse">Explore originals</Link>
            </Button>
            <Button
              asChild
              className="rounded-full"
              size="lg"
              variant="outline"
            >
              <Link href="/for-artists">Sell your work</Link>
            </Button>
          </div>
          <nav
            aria-label="Popular searches"
            className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"
          >
            <span>Popular:</span>
            {quickSearchLinks.map((link) => (
              <Link
                className="text-foreground underline-offset-4 hover:underline"
                href={buildBrowseHref(link.filters)}
                key={link.label}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <Suspense fallback={<FeaturedArtworkSkeleton />}>
          <FeaturedArtwork />
        </Suspense>
      </section>
    </div>
  );
}
