import Link from "next/link";

import { FollowArtistButton } from "@/components/collectors/follow-artist-button";
import type { TrendingArtist } from "@/components/home/home-data";

/** A row of artists to follow, each shown through their newest piece. */
export function TrendingArtists({ artists }: { artists: TrendingArtist[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {artists.map((artist) => (
        <li className="flex items-center gap-3.5" key={artist.artistUid}>
          <Link
            aria-hidden="true"
            className="size-16 shrink-0 overflow-hidden rounded-full bg-muted"
            href={`/artists/${artist.artistUsername}`}
            tabIndex={-1}
          >
            {artist.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="h-full w-full object-cover"
                src={artist.coverUrl}
              />
            ) : null}
          </Link>
          <div className="min-w-0 flex-1 text-sm">
            <Link
              className="block truncate font-semibold text-foreground underline-offset-4 hover:underline"
              href={`/artists/${artist.artistUsername}`}
            >
              {artist.artistName}
            </Link>
            <span className="text-muted-foreground">
              {artist.count === 1
                ? "1 work for sale"
                : `${artist.count} works for sale`}
            </span>
          </div>
          <FollowArtistButton
            artistName={artist.artistName}
            artistUid={artist.artistUid}
            className="rounded-full"
            compact
            size="sm"
            username={artist.artistUsername}
          />
        </li>
      ))}
    </ul>
  );
}
