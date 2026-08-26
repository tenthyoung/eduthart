"use client";

import { Scale, Sparkles } from "lucide-react";
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
import type { ArtworkRecommendation } from "@/lib/collectors/recommendations";

export function RecommendationsPage() {
  const { data, error, loading } = useCollectorResource<ArtworkRecommendation[]>({
    initialData: [],
    path: "/api/collectors/recommendations",
    select: (payload) => (payload.recommendations as ArtworkRecommendation[]) ?? [],
    signInPath: "/account/recommendations",
  });

  if (loading) {
    return (
      <AccountShell description="Artwork picked from what you save." title="For you">
        <CollectorLoadingPanel label="Looking through the gallery for you..." />
      </AccountShell>
    );
  }

  return (
    <AccountShell
      description="Available originals picked from the artists, media, and themes in your own favorites and follows."
      title="For you"
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Recommendations error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {data.length === 0 ? (
        <CollectorEmptyState
          action={
            <Button asChild>
              <Link href="/account/favorites">Go to favorites</Link>
            </Button>
          }
          description="Save a few pieces you like and follow an artist or two. Recommendations are built from those choices, not from anyone else's."
          icon={<Sparkles className="size-5" />}
          title="Nothing to recommend yet"
        />
      ) : (
        <ArtworkCardGrid>
          {data.map((recommendation) => (
            <ArtworkCard
              key={recommendation.artwork.key}
              actions={
                <Button
                  onClick={() => addToComparison(recommendation.artwork.key)}
                  size="sm"
                  variant="outline"
                >
                  <Scale />
                  Compare
                </Button>
              }
              artwork={recommendation.artwork}
              footnote={
                recommendation.reasons.length > 0 ? (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {recommendation.reasons.map((reason) => (
                      <li key={reason}>· {reason}</li>
                    ))}
                  </ul>
                ) : null
              }
            />
          ))}
        </ArtworkCardGrid>
      )}
    </AccountShell>
  );
}
