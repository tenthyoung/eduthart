"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { IndexedArtwork } from "@/lib/artists/artwork-index";
import { formatMinorUnits } from "@/lib/commerce/money";
import { cn } from "@/lib/utils";

export function formatArtworkPrice(
  artwork: Pick<IndexedArtwork, "currency" | "priceMinor">
) {
  // Artwork is priced in whole amounts, so "$820" reads better than "$820.00";
  // a price that really has cents keeps them.
  return artwork.priceMinor > 0
    ? formatMinorUnits(artwork.priceMinor, artwork.currency).replace(
        /\.00$/,
        ""
      )
    : "Price on request";
}

export function ArtworkAvailability({
  availability,
}: {
  availability: string;
}) {
  const isAvailable = availability === "original_available";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
        isAvailable
          ? "bg-green-100 text-green-800"
          : "bg-muted text-muted-foreground"
      )}
    >
      {isAvailable ? "Available" : availability.replaceAll("_", " ")}
    </span>
  );
}

/**
 * An artwork photo that fades up once it has loaded, over the muted tile
 * behind it, instead of painting in line by line.
 *
 * A cached image can finish before React attaches `onLoad`, so the effect
 * checks `complete` too; otherwise it would sit invisible forever.
 */
function ArtworkImage({
  alt,
  dimmed,
  src,
}: {
  alt: string;
  dimmed: boolean;
  src: string;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (ref.current?.complete) {
      setLoaded(true);
    }
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={cn(
        "h-full w-full object-cover transition-[opacity,scale] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:scale-[1.03] motion-reduce:transition-none",
        loaded ? (dimmed ? "opacity-70" : "opacity-100") : "opacity-0"
      )}
      onLoad={() => setLoaded(true)}
      ref={ref}
      src={src}
    />
  );
}

export function ArtworkCard({
  actions,
  artwork,
  footnote,
}: {
  actions?: ReactNode;
  artwork: IndexedArtwork;
  footnote?: ReactNode;
}) {
  const isAvailable = artwork.availability === "original_available";
  const details = [artwork.artistName, artwork.category]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="flex min-w-0 flex-col gap-3">
      {/* The title link below points to the same place, so this one is hidden
          from assistive technology rather than announced twice. */}
      <Link
        aria-hidden="true"
        className="group/card relative block aspect-[4/5] overflow-hidden rounded-xl bg-muted"
        href={artwork.href}
        tabIndex={-1}
      >
        {artwork.imageUrl ? (
          <ArtworkImage
            alt={artwork.title}
            dimmed={!isAvailable}
            src={artwork.imageUrl}
          />
        ) : null}
        {/* Every card is an original for sale unless it says otherwise, so
            only the exceptions get a label. */}
        {isAvailable ? null : (
          <span className="absolute left-2 top-2 rounded-full bg-background/95 px-2.5 py-1 text-xs font-semibold capitalize text-foreground">
            {artwork.availability.replaceAll("_", " ")}
          </span>
        )}
      </Link>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-base font-bold text-foreground">
          {formatArtworkPrice(artwork)}
        </p>
        <Link
          className="truncate text-[15px] text-foreground hover:underline"
          href={artwork.href}
        >
          {artwork.title}
        </Link>
        {details ? (
          <p className="truncate text-sm text-muted-foreground">{details}</p>
        ) : null}
      </div>
      {footnote}
      {actions ? (
        <div className="mt-auto flex flex-wrap gap-2">{actions}</div>
      ) : null}
    </article>
  );
}

/** Two columns on a phone, four on a wide screen. */
export const ARTWORK_GRID_CLASS =
  "grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4";

export function ArtworkCardGrid({ children }: { children: ReactNode }) {
  return <div className={ARTWORK_GRID_CLASS}>{children}</div>;
}

export function CollectorEmptyState({
  action,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-background text-brass">
        {icon}
      </div>
      <p className="mt-4 text-lg text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
