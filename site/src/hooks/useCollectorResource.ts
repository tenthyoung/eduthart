"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { collectorRequest } from "@/lib/collectors/client";

/**
 * Load and mutate one collector API resource.
 *
 * All the collector screens follow the same shape: send the visitor to sign in
 * if they are not, fetch once on mount, then re-render from whatever the API
 * returns after each mutation. Sharing that here keeps the pages down to their
 * own markup, and means a mutation never has to guess the new state locally.
 */
export function useCollectorResource<T>({
  initialData,
  path,
  select,
  signInPath,
}: {
  initialData: T;
  path: string;
  select: (payload: Record<string, unknown>) => T;
  signInPath: string;
}) {
  const router = useRouter();
  const { status, user } = useAuth();
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectRef = useRef(select);
  selectRef.current = select;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(signInPath)}`);
      return;
    }

    if (status !== "authenticated" || !user) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const payload = await collectorRequest<Record<string, unknown>>(
          path,
          await user.getIdToken()
        );

        if (!cancelled) {
          setData(selectRef.current(payload));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load this page."
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
  }, [path, router, signInPath, status, user]);

  const mutate = useCallback(
    async (
      init: { body?: unknown; method: string; path?: string },
      successMessage?: string
    ) => {
      if (!user) {
        return false;
      }

      try {
        const payload = await collectorRequest<Record<string, unknown>>(
          init.path ?? path,
          await user.getIdToken(),
          { body: init.body, method: init.method }
        );

        setData(selectRef.current(payload));

        if (successMessage) {
          toast.success(successMessage);
        }

        return true;
      } catch (mutateError) {
        toast.error(
          mutateError instanceof Error
            ? mutateError.message
            : "That change could not be saved."
        );
        return false;
      }
    },
    [path, user]
  );

  return {
    data,
    error,
    isReady: status === "authenticated" && !loading,
    loading: loading || status === "loading",
    setData,
    mutate,
    user,
  };
}
