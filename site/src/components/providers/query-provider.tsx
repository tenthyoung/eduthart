"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  // Created lazily in state so the client (and its cache) survives re-renders
  // but is never shared between server requests.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            // Cached data still paints instantly on a revisit, but every
            // mount revalidates in the background: collector data changes
            // server-side (orders, notifications), so a revisited page must
            // never sit on a stale cache.
            staleTime: 0,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
