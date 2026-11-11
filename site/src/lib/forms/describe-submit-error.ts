import { ApiError } from "@/lib/api/api-error";

/**
 * What kind of failure stopped a form, which decides what the person is told
 * to do next.
 */
export type SubmitErrorKind =
  | "offline"
  | "network"
  | "timeout"
  | "session"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "too-large"
  | "rate-limit"
  | "invalid"
  | "server"
  | "rejected";

export type SubmitErrorDescription = {
  kind: SubmitErrorKind;
  title: string;
  message: string;
};

/**
 * An error a submit handler throws on purpose, with words already fit to show.
 * Use it for failures that are not an HTTP response: a second factor that was
 * not accepted, a precondition the API cannot check.
 */
export class SubmitError extends Error {
  readonly title: string | null;

  constructor(message: string, options: { title?: string } = {}) {
    super(message);
    this.name = "SubmitError";
    this.title = options.title ?? null;
  }
}

const KEPT = "Everything you typed is still here.";
const CONTACT = "If it keeps happening, email support@eduthart.com.";

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** `fetch` rejects with a bare TypeError when the request never got an answer. */
function isNetworkFailure(error: unknown) {
  if (!(error instanceof TypeError)) {
    return false;
  }

  return /fetch|network|load failed|internet/i.test(error.message);
}

/** A DOMException is not an `Error` in every runtime, so check the name. */
function isTimeout(error: unknown) {
  const name = (error as { name?: unknown } | null)?.name;
  return name === "AbortError" || name === "TimeoutError";
}

function fromStatus(error: ApiError): SubmitErrorDescription {
  const serverSaid = error.readable ? error.message : null;

  if (error.status === 401) {
    return {
      kind: "session",
      title: "Your sign-in has expired",
      message: `Sign in again in a new tab, then come back here and submit. ${KEPT}`,
    };
  }

  if (error.status === 403) {
    return {
      kind: "forbidden",
      title: "This account can't do that",
      message: `${serverSaid ?? "Your account doesn't have permission to make this change."} If you think that's wrong, email support@eduthart.com.`,
    };
  }

  if (error.status === 404) {
    return {
      kind: "not-found",
      title: "We couldn't find what you're changing",
      message: `It may have been removed or moved. Reload the page and try again. ${KEPT}`,
    };
  }

  if (error.status === 409) {
    return {
      kind: "conflict",
      title: "This changed somewhere else",
      message: `${serverSaid ?? "Someone saved a newer version while you were editing."} Reload the page to see the latest, then try again.`,
    };
  }

  if (error.status === 413) {
    return {
      kind: "too-large",
      title: "That's too large to send",
      message: "Shorten the text or use a smaller file, then try again.",
    };
  }

  if (error.status === 429) {
    return {
      kind: "rate-limit",
      title: "Too many attempts",
      message: `Wait a minute, then try again. ${KEPT}`,
    };
  }

  if (error.status >= 400 && error.status < 500 && serverSaid) {
    return {
      kind: "invalid",
      title: "Please check the form",
      message: `${serverSaid} Fix that and submit again.`,
    };
  }

  return {
    kind: "server",
    title: "EduthArt had a problem on our side",
    message: `Nothing was saved, but ${KEPT.toLowerCase()} Try again in a minute. ${CONTACT}`,
  };
}

/**
 * Turn whatever a submit handler threw into a title and a message that say
 * what went wrong and what to do next. Never "Something went wrong".
 *
 * `fallbackTitle` heads errors whose message is already fit to show (a
 * `SubmitError`, or the friendly `Error`s the auth provider throws) — for
 * example "Sign-in failed".
 */
export function describeSubmitError(
  error: unknown,
  { fallbackTitle = "That didn't go through" }: { fallbackTitle?: string } = {}
): SubmitErrorDescription {
  if (isOffline()) {
    return {
      kind: "offline",
      title: "You're offline",
      message: `Nothing was sent. Reconnect to the internet and submit again. ${KEPT}`,
    };
  }

  if (error instanceof ApiError) {
    return fromStatus(error);
  }

  if (isTimeout(error)) {
    return {
      kind: "timeout",
      title: "EduthArt took too long to answer",
      message: `We can't tell whether it was saved. Wait a moment, then try again. ${KEPT}`,
    };
  }

  if (isNetworkFailure(error)) {
    return {
      kind: "network",
      title: "We couldn't reach EduthArt",
      message: `Nothing was sent. Check your connection and try again. ${KEPT}`,
    };
  }

  if (error instanceof SubmitError) {
    return {
      kind: "rejected",
      title: error.title ?? fallbackTitle,
      message: error.message,
    };
  }

  if (error instanceof Error && error.message) {
    return { kind: "rejected", title: fallbackTitle, message: error.message };
  }

  return {
    kind: "server",
    title: fallbackTitle,
    message: `We couldn't finish this just now. Try again in a minute. ${CONTACT}`,
  };
}
