import { Search } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { ArtworkSearchForm } from "@/components/browse/artwork-search-form";
import {
  ArtworkCard,
  ArtworkCardGrid,
  CollectorEmptyState,
} from "@/components/collectors/artwork-card";
import { Button } from "@/components/ui/button";
import { listIndexedArtworks } from "@/lib/artists/artwork-index";
import {
  buildBrowseHref,
  findBudgetOption,
  hasActiveFilters,
  parseArtworkSearchFilters,
  searchArtworks,
  summarizeCategories,
} from "@/lib/artists/artwork-search";

export const metadata: Metadata = {
  description:
    "Search original art by title, artist, medium, category, and budget.",
  title: "Browse original art | EduthArt",
};

/** The index is rewritten whenever an artist saves, so never serve it stale. */
export const dynamic = "force-dynamic";

function describeResults(count: number) {
  return count === 1 ? "1 artwork" : `${count} artworks`;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseArtworkSearchFilters(await searchParams);
  const index = await listIndexedArtworks();
  const results = searchArtworks(index, filters);
  const categories = summarizeCategories(index);
  const budget = findBudgetOption(filters.budget);

  const activeFilters = [
    filters.query.trim() ? `“${filters.query.trim()}”` : null,
    filters.category,
    budget?.label,
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-32 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <header className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
            Browse original art
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Every piece here is an available original from an EduthArt artist.
          </p>
        </header>

        <ArtworkSearchForm filters={filters} />

        {categories.length > 0 ? (
          <nav
            aria-label="Categories"
            className="flex flex-wrap justify-center gap-3"
          >
            <Link
              className={
                filters.category
                  ? "rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  : "rounded-full border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              }
              href={buildBrowseHref({
                budget: filters.budget,
                query: filters.query,
              })}
            >
              All work
            </Link>
            {categories.map((category) => (
              <Link
                key={category.name}
                className={
                  filters.category === category.name
                    ? "rounded-full border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    : "rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                }
                href={buildBrowseHref({
                  budget: filters.budget,
                  category: category.name,
                  query: filters.query,
                })}
              >
                {category.name}
                <span className="ml-2 text-xs text-muted-foreground">
                  {category.count}
                </span>
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {describeResults(results.length)}
            {activeFilters.length > 0
              ? ` for ${activeFilters.join(" · ")}`
              : ""}
          </p>
          {hasActiveFilters(filters) ? (
            <Button asChild size="sm" variant="ghost">
              <Link href="/browse">Clear filters</Link>
            </Button>
          ) : null}
        </div>

        {results.length === 0 ? (
          <CollectorEmptyState
            action={
              hasActiveFilters(filters) ? (
                <Button asChild>
                  <Link href="/browse">See all available art</Link>
                </Button>
              ) : undefined
            }
            description={
              hasActiveFilters(filters)
                ? "Nothing matched that search. Try fewer words, a different category, or a wider budget."
                : "No originals are listed for sale right now. New work is added as artists publish it."
            }
            icon={<Search className="size-5" />}
            title="No artwork found"
          />
        ) : (
          <ArtworkCardGrid>
            {results.map((artwork) => (
              <ArtworkCard artwork={artwork} key={artwork.key} />
            ))}
          </ArtworkCardGrid>
        )}
      </div>
    </main>
  );
}
