"use client";

import { History, Scale, Trash2 } from "lucide-react";
import Link from "next/link";

import { AccountShell } from "@/components/account/account-shell";
import {
  ArtworkCard,
  ArtworkCardGrid,
  CollectorEmptyState,
} from "@/components/collectors/artwork-card";
import { CollectorLoadingPanel } from "@/components/collectors/loading-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCollectorResource } from "@/hooks/useCollectorResource";
import { addToComparison } from "@/lib/collectors/comparison";
import type { RecentlyViewedArtwork } from "@/lib/collectors/recently-viewed";

function formatViewedAt(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export function RecentlyViewedPage() {
  const { data, error, loading, mutate } = useCollectorResource<
    RecentlyViewedArtwork[]
  >({
    initialData: [],
    path: "/api/collectors/recently-viewed",
    select: (payload) =>
      (payload.recentlyViewed as RecentlyViewedArtwork[]) ?? [],
    signInPath: "/account/recently-viewed",
  });
  const visible = data.filter((entry) => entry.artwork !== null);

  if (loading) {
    return (
      <AccountShell
        description="Artwork you looked at recently."
        title="Recently viewed"
      >
        <CollectorLoadingPanel label="Loading your recent views..." />
      </AccountShell>
    );
  }

  return (
    <AccountShell
      action={
        visible.length > 0 ? (
          <Button
            onClick={() =>
              void mutate(
                { method: "DELETE" },
                "Your viewing history has been cleared."
              )
            }
            variant="outline"
          >
            <Trash2 />
            Clear history
          </Button>
        ) : undefined
      }
      description="The last few originals you opened, so you can pick a thread back up."
      title="Recently viewed"
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>History error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {visible.length === 0 ? (
        <CollectorEmptyState
          action={
            <Button asChild>
              <Link href="/">Browse artwork</Link>
            </Button>
          }
          description="Open an artwork and it will show up here for the next time you visit."
          icon={<History className="size-5" />}
          title="Nothing viewed yet"
        />
      ) : (
        <ArtworkCardGrid>
          {visible.map((entry) =>
            entry.artwork ? (
              <ArtworkCard
                key={entry.key}
                actions={
                  <Button
                    onClick={() => addToComparison(entry.key)}
                    size="sm"
                    variant="outline"
                  >
                    <Scale />
                    Compare
                  </Button>
                }
                artwork={entry.artwork}
                footnote={
                  <p className="text-xs text-muted-foreground">
                    Viewed {formatViewedAt(entry.viewedAt)}
                  </p>
                }
              />
            ) : null
          )}
        </ArtworkCardGrid>
      )}
    </AccountShell>
  );
}
