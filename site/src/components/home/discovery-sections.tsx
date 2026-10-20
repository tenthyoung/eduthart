import { ArrowRight, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

import { CollectorEmptyState } from "@/components/collectors/artwork-card";
import { BudgetShelf } from "@/components/home/budget-shelf";
import { MotionFade } from "@/components/motion/motion-fade";
import { MotionStaggerFade } from "@/components/motion/motion-stagger-fade";
import { Button } from "@/components/ui/button";
import { listIndexedArtworks } from "@/lib/artists/artwork-index";
import {
  listAvailableArtworks,
  summarizeCategories,
} from "@/lib/artists/artwork-search";

/**
 * The homepage's two discovery paths, both read from the live artwork index.
 *
 * Categories and the budget shelf are rendered together so the index is read
 * once per request, and so a category tile can never advertise a count the
 * shelf below it disagrees with.
 */
export async function DiscoverySections() {
  const index = await listIndexedArtworks();
  const categories = summarizeCategories(index);
  const available = listAvailableArtworks(index);

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
      <section className="py-10 lg:py-14" id="collections">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-2xl text-foreground sm:text-3xl">
              Shop by medium
            </h2>
            <Link
              className="text-sm font-semibold text-foreground hover:underline"
              href="/browse"
            >
              All categories
            </Link>
          </div>

          {categories.length === 0 ? (
            <p className="mt-6 text-lg text-muted-foreground">
              Categories appear here as artists publish their first originals.
            </p>
          ) : (
            <nav aria-label="Browse by category" className="mt-6">
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
                      <span className="block aspect-[4/3] overflow-hidden rounded-xl bg-muted">
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

      <section className="py-10 lg:py-14" id="browse">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-2xl text-foreground sm:text-3xl">
              Originals by budget
            </h2>
            <span className="text-sm text-muted-foreground">
              {available.length === 1
                ? "1 original for sale"
                : `${available.length} originals for sale`}
            </span>
          </div>

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
          <div className="flex flex-col gap-6 rounded-2xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14 lg:py-14">
            <div className="max-w-xl">
              <h2 className="font-display text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-5xl">
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
                className="bg-highlight text-highlight-foreground hover:bg-highlight/90"
                size="lg"
              >
                <Link href="/contact">Ask a person</Link>
              </Button>
              <Button
                asChild
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
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
