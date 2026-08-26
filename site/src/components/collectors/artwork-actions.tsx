"use client";

import { Heart, Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { collectorRequest } from "@/lib/collectors/client";
import type { FavoriteRecord } from "@/lib/collectors/favorites";
import {
  isInComparison,
  subscribeToComparison,
  toggleComparison,
} from "@/lib/collectors/comparison";
import { cn } from "@/lib/utils";

/**
 * Save, compare, and view-history controls for one artwork.
 *
 * The view is recorded from here rather than from the server component so it
 * only counts a signed-in collector actually opening the page, not a crawler or
 * a prefetch.
 */
export function ArtworkActions({
  artworkKey,
  itemId,
  title,
  username,
}: {
  artworkKey: string;
  itemId: string;
  title: string;
  username: string;
}) {
  const router = useRouter();
  const { status, user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const artworkPath = `/artists/${username}/art/${itemId}`;

  useEffect(() => {
    setComparing(isInComparison(artworkKey));
    return subscribeToComparison((keys) =>
      setComparing(keys.includes(artworkKey))
    );
  }, [artworkKey]);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setSaved(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const token = await user.getIdToken();
        const payload = await collectorRequest<{ favorites: FavoriteRecord[] }>(
          "/api/collectors/favorites",
          token
        );

        if (!cancelled) {
          setSaved(
            payload.favorites.some((favorite) => favorite.key === artworkKey)
          );
        }

        await collectorRequest("/api/collectors/recently-viewed", token, {
          body: { itemId, username },
          method: "POST",
        });
      } catch {
        // Neither the saved state nor the view record is worth an error toast.
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [artworkKey, itemId, status, user, username]);

  const toggleSaved = async () => {
    if (!user || status !== "authenticated") {
      router.push(`/login?next=${encodeURIComponent(artworkPath)}`);
      return;
    }

    setBusy(true);

    try {
      await collectorRequest(
        "/api/collectors/favorites",
        await user.getIdToken(),
        {
          body: { itemId, username },
          method: saved ? "DELETE" : "POST",
        }
      );
      setSaved(!saved);
      toast.success(
        saved
          ? `Removed "${title}" from your favorites.`
          : `Saved "${title}" to your favorites.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update your favorites."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <Button
        aria-pressed={saved}
        disabled={busy}
        onClick={() => void toggleSaved()}
        type="button"
        variant="outline"
      >
        <Heart className={cn(saved && "fill-current text-primary")} />
        {saved ? "Saved" : "Save to favorites"}
      </Button>
      <Button
        aria-pressed={comparing}
        onClick={() => {
          toggleComparison(artworkKey);
          toast.success(
            isInComparison(artworkKey)
              ? `"${title}" added to your comparison.`
              : `"${title}" removed from your comparison.`
          );
        }}
        type="button"
        variant="outline"
      >
        <Scale className={cn(comparing && "text-primary")} />
        {comparing ? "In comparison" : "Compare"}
      </Button>
    </div>
  );
}
