"use client";

import { readApiError } from "@/lib/api/api-error";
import { SubmitError } from "@/lib/forms/describe-submit-error";

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

  // A 2xx we cannot read may still have saved, so don't say it didn't. A
  // SubmitError carries the honest message into a form's callout.
  if (!payload) {
    throw new SubmitError(
      `The server answered, but not in a way we could read (HTTP ${response.status}), so we can't tell whether that saved. Reload the page to check before trying again.`,
      { title: "We couldn't confirm that" }
    );
  }

  return payload;
}
