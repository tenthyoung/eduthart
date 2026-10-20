"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  ARTWORK_GRID_CLASS,
  ArtworkCard,
} from "@/components/collectors/artwork-card";
import { MotionStaggerFade } from "@/components/motion/motion-stagger-fade";
import { Button } from "@/components/ui/button";
import type { IndexedArtwork } from "@/lib/artists/artwork-index";
import {
  BUDGET_OPTIONS,
  buildBrowseHref,
  matchesBudget,
} from "@/lib/artists/artwork-search";
import { cn } from "@/lib/utils";

/** Two rows of the grid: enough to compare, not a catalogue. */
const SHELF_LIMIT = 8;

/**
 * Available originals with a budget switch above them.
 *
 * The switch filters what the page already has rather than navigating, so it
 * answers "what is there at my price?" in place; the link under the grid opens
 * the same band on the browse page for everything beyond the first two rows.
 */
export function BudgetShelf({ artworks }: { artworks: IndexedArtwork[] }) {
  const [budget, setBudget] = useState("");
  const matches = artworks.filter((artwork) => matchesBudget(artwork, budget));
  const shown = matches.slice(0, SHELF_LIMIT);
  const bands = [{ label: "Any price", value: "" }, ...BUDGET_OPTIONS];

  return (
    <div>
      <div
        // Not "Budget": the search form above already owns that label.
        aria-label="Filter by price"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        role="group"
      >
        {bands.map((band) => {
          const isActive = band.value === budget;

          return (
            <button
              aria-pressed={isActive}
              className={cn(
                "inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-foreground hover:border-foreground"
              )}
              key={band.label}
              onClick={() => setBudget(band.value)}
              type="button"
            >
              {band.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {shown.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
            Nothing at this price right now. New originals arrive every week.
          </p>
        ) : (
          // Keyed by band so choosing another price deals the new set in
          // afresh rather than swapping cards under a static grid.
          <MotionStaggerFade
            className={ARTWORK_GRID_CLASS}
            delay={0.06}
            duration={0.7}
            initialDelay={0.05}
            key={budget || "any"}
          >
            {shown.map((artwork) => (
              <ArtworkCard artwork={artwork} key={artwork.key} />
            ))}
          </MotionStaggerFade>
        )}
      </div>

      {matches.length > shown.length ? (
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" variant="outline">
            <Link href={buildBrowseHref({ budget })}>
              {`See all ${matches.length} originals`}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
