import { ArrowRight, Image as ImageIcon, LayoutGrid } from "lucide-react";
import Link from "next/link";

import {
  ArtworkCard,
  ArtworkCardGrid,
  CollectorEmptyState,
} from "@/components/collectors/artwork-card";
import { Button } from "@/components/ui/button";
import { listIndexedArtworks } from "@/lib/artists/artwork-index";
import {
  listAvailableArtworks,
  summarizeCategories,
} from "@/lib/artists/artwork-search";

/** Enough to fill three rows of the grid without turning the homepage into a catalogue. */
const HOMEPAGE_ARTWORK_LIMIT = 9;

/**
 * The homepage's two discovery paths, both read from the live artwork index.
 *
 * Categories and the gallery are rendered together so the index is read once
 * per request, and so a category tile can never advertise a count the gallery
 * below it disagrees with.
 */
export async function DiscoverySections() {
  const index = await listIndexedArtworks();
  const categories = summarizeCategories(index);
  const available = listAvailableArtworks(index);
  const featured = available.slice(0, HOMEPAGE_ARTWORK_LIMIT);

  return (
    <div className="bg-background">
      <section
        className="border-y border-border/40 bg-background py-18 lg:py-24"
        id="collections"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.22em] text-primary/70">
                <LayoutGrid className="h-4 w-4" />
                Browse by category
              </p>
              <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
                Start with the kind of work you want
              </h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/browse">
                See everything
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {categories.length === 0 ? (
            <p className="mt-8 text-lg text-muted-foreground">
              Categories appear here as artists publish their first originals.
            </p>
          ) : (
            <nav
              aria-label="Browse by category"
              className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {categories.map((category) => (
                <Link
                  key={category.name}
                  aria-label={`${category.name} artwork`}
                  className="group rounded-[1.75rem] border border-border/70 bg-card p-6 transition-colors hover:border-primary/40"
                  href={category.href}
                >
                  <h3 className="text-2xl font-semibold text-foreground group-hover:text-primary">
                    {category.name}
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    {category.count === 1
                      ? "1 available original"
                      : `${category.count} available originals`}
                  </p>
                </Link>
              ))}
            </nav>
          )}
        </div>
      </section>

      <section className="py-18 lg:py-24" id="browse">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary/70">
                Available now
              </p>
              <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
                Original work you can buy today
              </h2>
            </div>
            {available.length > featured.length ? (
              <Button asChild variant="outline">
                <Link href="/browse">
                  {`View all ${available.length} originals`}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="mt-10">
            {featured.length === 0 ? (
              <CollectorEmptyState
                action={
                  <Button asChild>
                    <Link href="/apply-to-be-an-artist">
                      Apply to be an artist
                    </Link>
                  </Button>
                }
                description="No originals are listed for sale right now. New work shows up here the moment an artist publishes it."
                icon={<ImageIcon className="size-5" />}
                title="The gallery is still filling up"
              />
            ) : (
              <ArtworkCardGrid>
                {featured.map((artwork) => (
                  <ArtworkCard artwork={artwork} key={artwork.key} />
                ))}
              </ArtworkCardGrid>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
