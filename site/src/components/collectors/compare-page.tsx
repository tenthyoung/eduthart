"use client";

import { Scale, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CollectorEmptyState } from "@/components/collectors/artwork-card";
import { Button } from "@/components/ui/button";
import type { IndexedArtwork } from "@/lib/artists/artwork-index";
import {
  clearComparison,
  listComparison,
  MAX_COMPARISON_ITEMS,
  removeFromComparison,
  subscribeToComparison,
} from "@/lib/collectors/comparison";
import { formatMinorUnits } from "@/lib/commerce/money";

const ROWS: Array<{ label: string; read: (artwork: IndexedArtwork) => string }> = [
  { label: "Artist", read: (artwork) => artwork.artistName },
  {
    label: "Price",
    read: (artwork) =>
      artwork.priceMinor > 0 ? formatMinorUnits(artwork.priceMinor, artwork.currency) : "On request",
  },
  { label: "Availability", read: (artwork) => artwork.availability.replaceAll("_", " ") },
  { label: "Medium", read: (artwork) => artwork.medium || "—" },
  { label: "Style", read: (artwork) => artwork.style || "—" },
  { label: "Category", read: (artwork) => artwork.category || "—" },
  { label: "Subject", read: (artwork) => artwork.subject || "—" },
  { label: "Tags", read: (artwork) => (artwork.tags.length > 0 ? artwork.tags.join(", ") : "—") },
];

/**
 * Side-by-side comparison.
 *
 * Keys come from the browser tray and are resolved against the public index on
 * every render, so a piece that sold while it sat in the tray shows its current
 * state rather than a stale snapshot.
 */
export function ComparePage() {
  const [keys, setKeys] = useState<string[]>([]);
  const [artworks, setArtworks] = useState<IndexedArtwork[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextKeys: string[]) => {
    if (nextKeys.length === 0) {
      setArtworks([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/collectors/artworks?keys=${nextKeys.join(",")}`);
      const payload = (await response.json()) as { artworks?: IndexedArtwork[] };
      const found = payload.artworks ?? [];
      // Preserve the order the collector added them in.
      setArtworks(
        nextKeys
          .map((key) => found.find((artwork) => artwork.key === key))
          .filter((artwork): artwork is IndexedArtwork => artwork !== undefined),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = listComparison();
    setKeys(initial);
    void load(initial);

    return subscribeToComparison((nextKeys) => {
      setKeys(nextKeys);
      void load(nextKeys);
    });
  }, [load]);

  return (
    <main className="min-h-screen bg-white px-4 pb-24 pt-36 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              <Scale className="size-3.5" />
              Compare
            </div>
            <h1 className="text-4xl text-foreground sm:text-5xl">Side by side</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Up to {MAX_COMPARISON_ITEMS} originals at once. Your selection lasts for this browser
              session.
            </p>
          </div>
          {keys.length > 0 ? (
            <Button onClick={() => clearComparison()} variant="outline">
              <Trash2 />
              Clear comparison
            </Button>
          ) : null}
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading your comparison...</p>
        ) : artworks.length === 0 ? (
          <CollectorEmptyState
            action={
              <Button asChild>
                <Link href="/account/favorites">Go to favorites</Link>
              </Button>
            }
            description="Add pieces from an artwork page or your favorites and they will line up here."
            icon={<Scale className="size-5" />}
            title="Nothing to compare yet"
          />
        ) : (
          <div className="overflow-x-auto rounded-[2rem] border border-border/70">
            <table className="w-full min-w-max border-collapse bg-white">
              <thead>
                <tr>
                  <th className="w-40 border-b border-border/70 p-4 text-left align-bottom text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Artwork
                  </th>
                  {artworks.map((artwork) => (
                    <th key={artwork.key} className="w-64 border-b border-border/70 p-4 align-top">
                      <div className="space-y-3 text-left">
                        <div className="flex items-start justify-between gap-2">
                          <Link className="text-base font-medium hover:underline" href={artwork.href}>
                            {artwork.title}
                          </Link>
                          <Button
                            aria-label={`Remove ${artwork.title} from the comparison`}
                            className="shrink-0"
                            onClick={() => removeFromComparison(artwork.key)}
                            size="icon"
                            variant="ghost"
                          >
                            <X />
                          </Button>
                        </div>
                        <Link className="block overflow-hidden rounded-xl bg-muted/30" href={artwork.href}>
                          {artwork.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt={artwork.title}
                              className="aspect-[4/3] w-full object-cover"
                              src={artwork.imageUrl}
                            />
                          ) : (
                            <div className="aspect-[4/3] w-full" />
                          )}
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="even:bg-muted/25">
                    <th className="p-4 text-left align-top text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {row.label}
                    </th>
                    {artworks.map((artwork) => (
                      <td key={artwork.key} className="p-4 align-top text-sm text-foreground">
                        {row.read(artwork)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th className="p-4" />
                  {artworks.map((artwork) => (
                    <td key={artwork.key} className="p-4 align-top">
                      <Button asChild size="sm">
                        <Link href={artwork.href}>View artwork</Link>
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
