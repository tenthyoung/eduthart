"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { exitGhostMode } from "@/lib/admin/ghost";

/**
 * Always-visible notice while an admin is signed in as another account.
 *
 * Driven by the `impersonatedBy` claim on the ID token, so it appears on every
 * page and cannot be dismissed without exiting.
 */
export function GhostBanner() {
  const { user } = useAuth();
  const [exiting, setExiting] = useState(false);

  if (!user?.impersonatedBy) {
    return null;
  }

  const ghostedUid = user.uid;

  const handleExit = async () => {
    setExiting(true);
    try {
      await exitGhostMode(ghostedUid);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't exit ghost mode. Sign in to the admin console again."
      );
      setExiting(false);
    }
  };

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-4 z-[100] mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center justify-between gap-3 rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-950 shadow-lg dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <span className="min-w-0 truncate">
        Ghosting <strong>{user.email ?? user.uid}</strong>
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={exiting}
        onClick={() => void handleExit()}
      >
        {exiting ? "Exiting..." : "Exit"}
      </Button>
    </div>
  );
}
