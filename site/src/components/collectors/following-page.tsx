"use client";

import { UserMinus, UserRound } from "lucide-react";
import Link from "next/link";

import { AccountShell } from "@/components/account/account-shell";
import { CollectorEmptyState } from "@/components/collectors/artwork-card";
import { CollectorLoadingPanel } from "@/components/collectors/loading-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCollectorResource } from "@/hooks/useCollectorResource";
import type { FollowedArtist } from "@/lib/collectors/follows";

export function FollowingPage() {
  const { data, error, loading, mutate } = useCollectorResource<
    FollowedArtist[]
  >({
    initialData: [],
    path: "/api/collectors/follows",
    select: (payload) => (payload.following as FollowedArtist[]) ?? [],
    signInPath: "/account/following",
  });

  if (loading) {
    return (
      <AccountShell description="Artists you follow." title="Following">
        <CollectorLoadingPanel label="Loading the artists you follow..." />
      </AccountShell>
    );
  }

  return (
    <AccountShell
      description="You are notified when these artists publish new work or lower a price."
      title="Following"
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Following error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {data.length === 0 ? (
        <CollectorEmptyState
          action={
            <Button asChild>
              <Link href="/">Find artists</Link>
            </Button>
          }
          description="Follow an artist from their page to hear first about new originals and price drops."
          icon={<UserRound className="size-5" />}
          title="You are not following anyone yet"
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((artist) => (
            <li
              key={artist.artistUid}
              className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-border/70 bg-white dark:bg-card p-5"
            >
              <div className="min-w-0">
                <Link
                  className="text-lg font-medium text-foreground hover:underline"
                  href={`/artists/${artist.artistUsername}`}
                >
                  {artist.artistName || `@${artist.artistUsername}`}
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                  @{artist.artistUsername}
                </p>
              </div>
              <Button
                onClick={() =>
                  void mutate(
                    { body: { artistUid: artist.artistUid }, method: "DELETE" },
                    `You no longer follow ${artist.artistName || `@${artist.artistUsername}`}.`
                  )
                }
                size="sm"
                variant="outline"
              >
                <UserMinus />
                Unfollow
              </Button>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
