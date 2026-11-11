"use client";

import { ApiError, readApiError } from "@/lib/api/api-error";

/**
 * Authenticated fetch helper for the collector APIs.
 *
 * Every collector screen does the same thing: attach the Firebase ID token,
 * parse the JSON, and surface the server's message on failure.
 */
export async function collectorRequest<T>(
  path: string,
  token: string,
  init?: { body?: unknown; method?: string }
): Promise<T> {
  const response = await fetch(path, {
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${token}`,
    },
    method: init?.method ?? "GET",
  });

  if (!response.ok) {
    // An ApiError keeps the status, so a form can tell the person to sign in
    // again, wait, or reload, and not just repeat the server's words.
    throw await readApiError(response, "That request could not be completed.");
  }

  const payload = (await response.json().catch(() => null)) as T | null;

  // A broken server answers with an HTML page rather than JSON. Say so instead
  // of blaming the request, or a failed build reads as a rejected action.
  if (!payload) {
    throw new ApiError({
      message: `The server sent a response we could not read (HTTP ${response.status}). It may need to be restarted.`,
      readable: false,
      status: 502,
    });
  }

  return payload;
}
