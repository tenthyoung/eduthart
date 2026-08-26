import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { ArtworkSearchForm } from "@/components/browse/artwork-search-form";
import { Button } from "@/components/ui/button";
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
  { filters: { query: "abstract" }, label: "Abstract works" },
  { filters: { category: "Painting" }, label: "Paintings" },
  { filters: { category: "Photography" }, label: "Photography" },
  { filters: { budget: "under-1000" }, label: "Under $1,000" },
];

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-background pt-28 pb-18 sm:pt-32 lg:pt-36 lg:pb-24">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-medium text-primary shadow-[0_16px_40px_-30px_rgba(56,40,25,0.28)]">
            <Sparkles className="h-4 w-4" />
            Search original art by title, artist, category, or budget
          </div>

          <h1 className="mt-6 text-5xl font-semibold leading-[0.96] tracking-[-0.05em] text-foreground sm:text-6xl lg:text-7xl">
            Discover and collect original art from emerging artists
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Every piece is an available original, listed by the artist who made
            it. Search for something specific, or browse the categories below.
          </p>
        </div>

        <ArtworkSearchForm filters={EMPTY_FILTERS} />

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-3">
            {quickSearchLinks.map((link) => (
              <Link
                key={link.label}
                className="rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                href={buildBrowseHref(link.filters)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <Button
            asChild
            className="justify-start lg:justify-center"
            size="lg"
            variant="ghost"
          >
            <Link href="/browse">
              Browse all available art
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
