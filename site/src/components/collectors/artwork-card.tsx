"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import type { IndexedArtwork } from "@/lib/artists/artwork-index";
import { formatMinorUnits } from "@/lib/commerce/money";
import { cn } from "@/lib/utils";

export function formatArtworkPrice(
  artwork: Pick<IndexedArtwork, "currency" | "priceMinor">
) {
  return artwork.priceMinor > 0
    ? formatMinorUnits(artwork.priceMinor, artwork.currency)
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

export function ArtworkCard({
  actions,
  artwork,
  footnote,
}: {
  actions?: ReactNode;
  artwork: IndexedArtwork;
  footnote?: ReactNode;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-[1.5rem] border border-border/70 bg-white dark:bg-card shadow-sm transition-shadow hover:shadow-lg">
      {/* The title link below points to the same place, so this one is hidden
          from assistive technology rather than announced twice. */}
      <Link
        aria-hidden="true"
        className="block aspect-[4/3] overflow-hidden bg-muted/30"
        href={artwork.href}
        tabIndex={-1}
      >
        {artwork.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={artwork.title}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
            src={artwork.imageUrl}
          />
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              className="text-lg font-medium text-foreground hover:underline"
              href={artwork.href}
            >
              {artwork.title}
            </Link>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              by {artwork.artistName}
            </p>
          </div>
          <p className="shrink-0 font-semibold text-foreground">
            {formatArtworkPrice(artwork)}
          </p>
        </div>
        <ArtworkAvailability availability={artwork.availability} />
        {footnote}
        {actions ? (
          <div className="mt-auto flex flex-wrap gap-2 pt-2">{actions}</div>
        ) : null}
      </div>
    </article>
  );
}

export function ArtworkCardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
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
    <div className="rounded-[2rem] border border-dashed border-border bg-white/70 dark:bg-card/70 px-6 py-16 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
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
