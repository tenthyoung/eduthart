"use client";

/**
 * Authenticated fetch helper for the collector APIs.
 *
 * Every collector screen does the same thing: attach the Firebase ID token,
 * parse the JSON, and surface the server's message on failure.
 */
export async function collectorRequest<T>(
  path: string,
  token: string,
  init?: { body?: unknown; method?: string },
): Promise<T> {
  const response = await fetch(path, {
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
    method: init?.method ?? "GET",
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null;

  if (!response.ok || !payload) {
    throw new Error(payload?.error?.message ?? "That request could not be completed.");
  }

  return payload;
}
