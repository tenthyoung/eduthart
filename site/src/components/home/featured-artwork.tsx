import Link from "next/link";

import { getHomeAvailable } from "@/components/home/home-data";
import { Skeleton } from "@/components/ui/skeleton";
import { formatArtworkPrice } from "@/lib/artists/artwork-price";

/** The hero's picture: the newest original you could buy today, captioned like a wall label. */
export async function FeaturedArtwork() {
  const featured = (await getHomeAvailable()).find(
    (artwork) => artwork.imageUrl
  );

  if (!featured?.imageUrl) {
    return <div className="hidden aspect-[4/3] bg-muted lg:block" />;
  }

  const medium = featured.medium || featured.category;

  return (
    <figure className="m-0 flex flex-col gap-2.5">
      <Link
        className="group block overflow-hidden bg-muted"
        href={featured.href}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={`${featured.title} by ${featured.artistName}`}
          className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02] lg:aspect-auto lg:h-[460px]"
          src={featured.imageUrl}
        />
      </Link>
      <figcaption className="flex items-baseline justify-between gap-4 text-sm">
        <span className="min-w-0 truncate">
          <span className="font-semibold">{featured.artistName}</span>,{" "}
          <Link
            className="italic underline-offset-4 hover:underline"
            href={featured.href}
          >
            {featured.title}
          </Link>
          {medium ? (
            <span className="text-muted-foreground"> · {medium}</span>
          ) : null}
        </span>
        <span className="shrink-0 font-semibold">
          {formatArtworkPrice(featured)}
        </span>
      </figcaption>
    </figure>
  );
}

export function FeaturedArtworkSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      <Skeleton className="aspect-[4/3] w-full rounded-none lg:aspect-auto lg:h-[460px]" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
