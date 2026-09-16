"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { AuthUser } from "@/components/auth/auth-provider";
import { parseApiError } from "@/lib/api/parse-api-error";
import type { AccountProfile } from "@/lib/auth/account-profile";

type Status = "authenticated" | "loading" | "unauthenticated";

/**
 * Loads the signed-in collector's profile and applies edits to it.
 *
 * The load used to live in the page alongside the sign-out and delete flags,
 * so flipping "signing out" re-ran the fetch. Only the identity the profile
 * belongs to belongs in the dependency list.
 */
export function useAccountProfile({
  onLoaded,
  status,
  user,
}: {
  onLoaded: (profile: AccountProfile) => void;
  status: Status;
  user: AuthUser | null;
}) {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Kept in a ref so a caller can pass an inline callback without restarting
  // the fetch on every render.
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/auth/profile", {
          headers: { authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(
            await parseApiError(
              response,
              "Unable to load your account settings."
            )
          );
        }

        const payload = (await response.json()) as { profile: AccountProfile };

        if (cancelled) {
          return;
        }

        setProfile(payload.profile);
        onLoadedRef.current(payload.profile);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your account settings."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [status, user]);

  const patchProfile = useCallback(
    async (body: Record<string, unknown>, successMessage: string) => {
      if (!user) {
        return null;
      }

      const token = await user.getIdToken();
      const response = await fetch("/api/auth/profile", {
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error(
          await parseApiError(response, "Unable to update your profile.")
        );
      }

      const payload = (await response.json()) as { profile: AccountProfile };
      setProfile(payload.profile);
      toast.success(successMessage);
      return payload.profile;
    },
    [user]
  );

  /**
   * Surfaces a failure the same way everywhere: a toast for the action the
   * collector just took, plus the persistent banner at the top of the page.
   */
  const reportError = useCallback((cause: unknown, fallback: string) => {
    const message = cause instanceof Error ? cause.message : fallback;
    setError(message);
    toast.error(message);
  }, []);

  /** patchProfile with the try/catch every caller was repeating. */
  const runProfileUpdate = useCallback(
    async (
      body: Record<string, unknown>,
      successMessage: string,
      errorFallback: string
    ) => {
      setError(null);

      try {
        return await patchProfile(body, successMessage);
      } catch (updateError) {
        reportError(updateError, errorFallback);
        return null;
      }
    },
    [patchProfile, reportError]
  );

  return {
    error,
    loading,
    profile,
    reportError,
    runProfileUpdate,
    setError,
    setProfile,
  };
}
