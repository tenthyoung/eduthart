import { ArrowRight, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

import {
  ArtworkCard,
  CollectorEmptyState,
} from "@/components/collectors/artwork-card";
import { BudgetShelf } from "@/components/home/budget-shelf";
import {
  getHomeIndex,
  summarizeTrendingArtists,
} from "@/components/home/home-data";
import { SectionHeading } from "@/components/home/section-heading";
import { TrendingArtists } from "@/components/home/trending-artists";
import { MotionFade } from "@/components/motion/motion-fade";
import { MotionStaggerFade } from "@/components/motion/motion-stagger-fade";
import { Button } from "@/components/ui/button";
import {
  listAvailableArtworks,
  summarizeCategories,
} from "@/lib/artists/artwork-search";

/** One row of the five-up grid: the newest work, at a glance. */
const NEW_WORKS_LIMIT = 5;

/**
 * The homepage's discovery paths, all read from the live artwork index.
 *
 * They are rendered together so the index is read once per request, and so a
 * category tile can never advertise a count the shelf below it disagrees with.
 */
export async function DiscoverySections() {
  const index = await getHomeIndex();
  const categories = summarizeCategories(index);
  const available = listAvailableArtworks(index);
  const newest = available.slice(0, NEW_WORKS_LIMIT);
  const trending = summarizeTrendingArtists(available);

  // Each tile shows the newest available piece in its category, so the picture
  // is always something you could actually buy.
  const coverFor = (category: string) =>
    available.find(
      (artwork) =>
        artwork.imageUrl &&
        artwork.category.trim().toLowerCase() === category.toLowerCase()
    )?.imageUrl ?? null;

  return (
    <div className="pb-20 lg:pb-28">
      {newest.length > 0 ? (
        <section
          aria-labelledby="new-works-heading"
          className="py-8 lg:py-10"
          id="new"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              href="/browse"
              id="new-works-heading"
              linkLabel="View all"
              title="New works"
            />
            <MotionStaggerFade
              className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-5"
              delay={0.06}
              duration={0.7}
              initialDelay={0.05}
            >
              {newest.map((artwork) => (
                <ArtworkCard artwork={artwork} key={artwork.key} />
              ))}
            </MotionStaggerFade>
          </div>
        </section>
      ) : null}

      {trending.length > 0 ? (
        <section
          aria-labelledby="trending-artists-heading"
          className="py-8 lg:py-10"
          id="artists"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              id="trending-artists-heading"
              title="Trending artists"
            />
            <TrendingArtists artists={trending} />
          </div>
        </section>
      ) : null}

      <section className="py-8 lg:py-10" id="collections">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            href="/browse"
            linkLabel="All categories"
            title="Shop by medium"
          />

          {categories.length === 0 ? (
            <p className="text-lg text-muted-foreground">
              Categories appear here as artists publish their first originals.
            </p>
          ) : (
            <nav aria-label="Browse by category">
              <MotionStaggerFade
                className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 lg:grid-cols-4"
                delay={0.07}
                duration={0.8}
                initialDelay={0.1}
              >
                {categories.map((category) => {
                  const cover = coverFor(category.name);

                  return (
                    <Link
                      key={category.name}
                      aria-label={`${category.name} artwork`}
                      className="group flex flex-col gap-3"
                      href={category.href}
                    >
                      <span className="block aspect-[4/3] overflow-hidden bg-muted">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            src={cover}
                          />
                        ) : null}
                      </span>
                      <span className="flex flex-col">
                        <span className="text-base font-semibold text-foreground">
                          {category.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {category.count === 1
                            ? "1 original"
                            : `${category.count} originals`}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </MotionStaggerFade>
            </nav>
          )}
        </div>
      </section>

      <section className="py-8 lg:py-10" id="browse">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            aside={
              <span className="text-sm text-muted-foreground">
                {available.length === 1
                  ? "1 original for sale"
                  : `${available.length} originals for sale`}
              </span>
            }
            title="Originals by budget"
          />

          {available.length === 0 ? (
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
            <BudgetShelf artworks={available} />
          )}
        </div>
      </section>

      <section className="pt-6 lg:pt-10">
        <MotionFade
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
          delay={0.1}
          duration={0.9}
        >
          <div className="flex flex-col gap-6 bg-primary px-6 py-10 text-primary-foreground sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14 lg:py-14">
            <div className="max-w-xl">
              <h2 className="text-4xl leading-[1.02] font-semibold tracking-[-0.04em] sm:text-5xl">
                Not sure where to start?
              </h2>
              <p className="mt-4 text-base leading-7 opacity-80">
                Tell us what you are looking for, the space and the budget, and
                someone from EduthArt will point you to a few pieces.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                className="rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                size="lg"
              >
                <Link href="/contact">Ask a person</Link>
              </Button>
              <Button
                asChild
                className="rounded-full border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                size="lg"
                variant="outline"
              >
                <Link href="/browse">
                  Browse everything
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </MotionFade>
      </section>
    </div>
  );
}
