import { NextResponse } from "next/server";

import {
  getAuthenticatedSession,
  type AuthenticatedSession,
} from "@/lib/auth/server-session";

export function apiError(
  message: string,
  status: number,
  code = "invalid-argument"
) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * Run a route handler with an authenticated session.
 *
 * Every collector route needs the same three things: verify the caller, turn a
 * thrown message into a 400, and turn a missing or invalid token into a 401.
 * Doing that here keeps the route files down to their actual behaviour.
 */
export async function withSession(
  request: Request,
  handler: (session: AuthenticatedSession) => Promise<Response>
): Promise<Response> {
  let session: AuthenticatedSession;

  try {
    session = await getAuthenticatedSession(request);
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "You need to be signed in.",
      401,
      "unauthenticated"
    );
  }

  try {
    return await handler(session);
  } catch (error) {
    console.error(error);
    return apiError(
      error instanceof Error
        ? error.message
        : "That request could not be completed.",
      400
    );
  }
}

export function getRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

/**
 * Refuse an action an admin must not take while signed in as someone else.
 *
 * Ghosting exists to see what the account holder sees. Deleting their account,
 * spending their saved card or sending them security emails goes well past
 * that, so those routes call this first and return its response when set.
 */
export function refuseWhileImpersonating(
  session: AuthenticatedSession,
  action: string
) {
  if (!session.impersonatedBy) {
    return null;
  }

  return apiError(
    `You can't ${action} while signed in as another user. Exit ghost mode first.`,
    403,
    "impersonation-blocked"
  );
}
