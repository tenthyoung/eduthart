/**
 * Call an App Router route handler the way Next.js would.
 *
 * A route handler is an ordinary function of a Request, so the integration
 * suite invokes it directly instead of standing up a server. What is exercised
 * is the real handler, the real session check, and the real store underneath —
 * only the HTTP hop and the browser are gone.
 */

const ORIGIN = "http://127.0.0.1:3005";

type RouteContext<Params> = { params: Promise<Params> };

export type RouteHandler<Params = never> = (
  request: Request,
  context: RouteContext<Params>
) => Promise<Response> | Response;

export type CallOptions<Params> = {
  /** Signs the request as this test account, as `signInAs` does in the browser. */
  as?: string;
  body?: unknown;
  method?: string;
  params?: Params;
  /** Path and query, e.g. "/api/cart?foo=1". */
  path?: string;
};

export type RouteResponse<Body> = {
  body: Body;
  response: Response;
  status: number;
};

export async function callRoute<Body = unknown, Params = never>(
  handler: RouteHandler<Params>,
  options: CallOptions<Params> = {}
): Promise<RouteResponse<Body>> {
  const method =
    options.method ?? (options.body === undefined ? "GET" : "POST");
  const headers = new Headers();

  if (options.as) {
    headers.set("authorization", `Bearer e2e:${options.as}`);
  }

  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  const request = new Request(`${ORIGIN}${options.path ?? "/"}`, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers,
    method,
  });

  const response = await handler(request, {
    params: Promise.resolve(options.params as Params),
  });
  const text = await response.clone().text();

  let body: Body;

  try {
    body = JSON.parse(text) as Body;
  } catch {
    body = text as Body;
  }

  return { body, response, status: response.status };
}

/** Call a route and fail loudly unless it succeeded. */
export async function callRouteOk<Body = unknown, Params = never>(
  handler: RouteHandler<Params>,
  options: CallOptions<Params> = {}
): Promise<Body> {
  const result = await callRoute<Body, Params>(handler, options);

  if (!result.response.ok) {
    throw new Error(
      `${options.method ?? "GET"} ${options.path ?? "/"} failed with ${result.status}: ${JSON.stringify(result.body)}`
    );
  }

  return result.body;
}
