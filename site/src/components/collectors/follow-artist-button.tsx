"use client";

import { UserMinus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { collectorRequest } from "@/lib/collectors/client";
import type { FollowedArtist } from "@/lib/collectors/follows";

export function FollowArtistButton({
  artistName,
  artistUid,
  username,
}: {
  artistName: string;
  artistUid: string;
  username: string;
}) {
  const router = useRouter();
  const { status, user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const isOwnPage = user?.uid === artistUid;

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setFollowing(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const payload = await collectorRequest<{ following: FollowedArtist[] }>(
          "/api/collectors/follows",
          await user.getIdToken()
        );

        if (!cancelled) {
          setFollowing(
            payload.following.some((artist) => artist.artistUid === artistUid)
          );
        }
      } catch {
        // Leaving the button in its default state is better than an error here.
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [artistUid, status, user]);

  const toggle = async () => {
    if (!user || status !== "authenticated") {
      router.push(`/login?next=${encodeURIComponent(`/artists/${username}`)}`);
      return;
    }

    setBusy(true);

    try {
      await collectorRequest(
        "/api/collectors/follows",
        await user.getIdToken(),
        {
          body: { artistUid },
          method: following ? "DELETE" : "POST",
        }
      );
      setFollowing(!following);
      toast.success(
        following
          ? `You no longer follow ${artistName}.`
          : `You now follow ${artistName}.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update who you follow."
      );
    } finally {
      setBusy(false);
    }
  };

  if (isOwnPage) {
    return null;
  }

  return (
    <Button
      disabled={busy}
      onClick={() => void toggle()}
      type="button"
      variant={following ? "outline" : "default"}
    >
      {following ? <UserMinus /> : <UserPlus />}
      {following ? "Following" : "Follow artist"}
    </Button>
  );
}
