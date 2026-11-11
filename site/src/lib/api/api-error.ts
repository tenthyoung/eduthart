/**
 * A failed API response, kept as data rather than flattened into a string.
 *
 * Forms need more than the message: the HTTP status decides what the person
 * should do next (sign in again, wait, reload, fix a field), and a route that
 * rejects one field can say which one. `describeSubmitError` reads all of this.
 *
 * It is still an `Error` whose `message` is the server's own, so code that only
 * ever showed `error.message` keeps working unchanged.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  /** Per-field messages, keyed by the request body's field names. */
  readonly fieldErrors: Record<string, string>;
  /** False when the body was not JSON: a crashed function, a proxy page. */
  readonly readable: boolean;

  constructor({
    code = null,
    fieldErrors = {},
    message,
    readable = true,
    status,
  }: {
    code?: string | null;
    fieldErrors?: Record<string, string>;
    message: string;
    readable?: boolean;
    status: number;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.readable = readable;
  }
}

type ErrorBody = {
  error?:
    | string
    | {
        code?: string;
        message?: string;
        details?: unknown;
        fields?: Record<string, string>;
      };
  fields?: Record<string, string>;
};

function pickFieldErrors(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

/**
 * Turn a non-2xx response into an `ApiError`.
 *
 * Routes here answer `{ error: { message } }` or, in a few older ones,
 * `{ error: "message" }`. A response that never reached a route handler
 * carries HTML or nothing, and is marked unreadable so the form can say the
 * server failed rather than blame the person's input.
 */
export async function readApiError(
  response: Response,
  fallbackMessage = "That request could not be completed."
): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as ErrorBody | null;

  if (!body) {
    return new ApiError({
      message: `${fallbackMessage} (HTTP ${response.status})`,
      readable: false,
      status: response.status,
    });
  }

  const error = body.error;

  if (typeof error === "string") {
    return new ApiError({
      fieldErrors: pickFieldErrors(body.fields),
      message: error,
      status: response.status,
    });
  }

  return new ApiError({
    code: error?.code ?? null,
    fieldErrors: pickFieldErrors(
      error?.fields ??
        (error?.details as { fields?: unknown } | undefined)?.fields ??
        body.fields
    ),
    message: error?.message ?? fallbackMessage,
    status: response.status,
  });
}

/**
 * `fetch` a JSON API and return its body, throwing `ApiError` on any non-2xx.
 *
 * A network failure still throws the browser's own `TypeError`, which
 * `describeSubmitError` recognises as "could not reach us".
 */
export async function requestJson<T = unknown>(
  input: string,
  init: Omit<RequestInit, "body"> & { body?: unknown } = {}
): Promise<T> {
  const { body, headers, ...rest } = init;
  const response = await fetch(input, {
    ...rest,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(headers ?? {}),
    },
  });

  if (!response.ok) {
    throw await readApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json().catch(() => undefined)) as T;
}
