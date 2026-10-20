import Link from "next/link";

import { ArtworkSearchForm } from "@/components/browse/artwork-search-form";
import {
  buildBrowseHref,
  EMPTY_FILTERS,
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
    <section className="pt-28 pb-10 sm:pt-32 lg:pt-36 lg:pb-14">
      {/* `rise-in` staggers the lines in with CSS alone, so the hero is never
          held back waiting for the page's JavaScript. */}
      <div className="rise-in mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <h1 className="text-[2.5rem] leading-[1.02] tracking-[-0.03em] text-foreground sm:text-6xl lg:text-7xl">
            Find a piece you&rsquo;ll love{" "}
            <span className="font-display font-normal tracking-[-0.01em] text-brass">
              living with.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Every piece is an original, signed by the artist who made it and
            shipped from their studio.
          </p>
        </div>

        <ArtworkSearchForm className="mx-0" filters={EMPTY_FILTERS} />

        <nav aria-label="Popular searches" className="flex flex-wrap gap-2">
          {quickSearchLinks.map((link) => (
            <Link
              key={link.label}
              className="inline-flex h-11 items-center rounded-full border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground"
              href={buildBrowseHref(link.filters)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
