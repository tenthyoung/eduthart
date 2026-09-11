/**
 * Read the error message out of a failed API response.
 *
 * Every API route responds with `{ error: { message } }`, but a response that
 * never reached a route handler (a dev server mid-compile, a crashed function,
 * a proxy) carries HTML or nothing. Fall back to the caller's message plus the
 * HTTP status so those failures stay diagnosable instead of collapsing into
 * one generic toast.
 */
export async function parseApiError(
  response: Response,
  fallbackMessage: string
) {
  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;

  return (
    payload?.error?.message ?? `${fallbackMessage} (HTTP ${response.status})`
  );
}
