"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { collectorRequest } from "@/lib/collectors/client";

/**
 * Load and mutate one collector API resource.
 *
 * All the collector screens follow the same shape: send the visitor to sign in
 * if they are not, fetch on mount, then re-render from whatever the API
 * returns after each mutation. Sharing that here keeps the pages down to their
 * own markup, and means a mutation never has to guess the new state locally.
 *
 * Backed by React Query, so a resource fetched once is cached per user and
 * path: navigating back to a page paints the cached data immediately and
 * revalidates in the background, and each mutation writes the payload the API
 * returns straight into that cache.
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
  const queryClient = useQueryClient();
  const { status, user } = useAuth();
  const selectRef = useRef(select);
  selectRef.current = select;
  const initialDataRef = useRef(initialData);
  initialDataRef.current = initialData;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(signInPath)}`);
    }
  }, [router, signInPath, status]);

  const queryKey = ["collector", path, user?.uid];

  const query = useQuery<T>({
    enabled: status === "authenticated" && Boolean(user),
    queryKey,
    queryFn: async () => {
      if (!user) {
        throw new Error("You need to be signed in to load this page.");
      }

      const payload = await collectorRequest<Record<string, unknown>>(
        path,
        await user.getIdToken()
      );
      return selectRef.current(payload);
    },
  });

  const setData = useCallback(
    (action: T | ((current: T) => T)) => {
      queryClient.setQueryData<T>(["collector", path, user?.uid], (current) => {
        const base = current ?? initialDataRef.current;
        return typeof action === "function"
          ? (action as (value: T) => T)(base)
          : action;
      });
    },
    [path, queryClient, user?.uid]
  );

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

        // A background refetch that started before this mutation could land
        // after it and overwrite the fresh payload with pre-mutation data.
        await queryClient.cancelQueries({
          queryKey: ["collector", path, user.uid],
        });
        queryClient.setQueryData<T>(
          ["collector", path, user.uid],
          selectRef.current(payload)
        );

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
    [path, queryClient, user]
  );

  const loading = status !== "authenticated" || query.isPending;

  return {
    data: query.data ?? initialData,
    error:
      query.error === null
        ? null
        : query.error instanceof Error
          ? query.error.message
          : "Unable to load this page.",
    isReady: status === "authenticated" && !query.isPending,
    loading,
    setData,
    mutate,
    user,
  };
}
