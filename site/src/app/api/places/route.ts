import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/server-session";
import {
  isGooglePlacesEnabled,
  lookupCity,
  searchCities,
} from "@/lib/places/google-places";

/**
 * City search for profile and application location fields.
 *
 * GET  → { enabled } so the field knows whether to offer search or plain
 *        inputs.
 * POST { input, sessionToken }   → { suggestions }
 * POST { placeId, name, sessionToken } → { location }
 *
 * POST needs a signed-in account so the Places key can't be used as a free
 * public proxy.
 */

type PlacesBody = {
  input?: unknown;
  /** The name shown in the list for the place that was picked. */
  name?: unknown;
  placeId?: unknown;
  sessionToken?: unknown;
};

function readSessionToken(value: unknown) {
  return typeof value === "string" && /^[\w-]{8,64}$/.test(value)
    ? value
    : null;
}

export function GET() {
  return NextResponse.json({ enabled: isGooglePlacesEnabled() });
}

export async function POST(request: Request) {
  try {
    await getAuthenticatedSession(request);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "unauthenticated",
          message: "Sign in to search for your city.",
        },
      },
      { status: 401 }
    );
  }

  if (!isGooglePlacesEnabled()) {
    return NextResponse.json(
      {
        error: {
          code: "places-disabled",
          message: "City search isn't available. Type your city instead.",
        },
      },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as PlacesBody;
  const sessionToken = readSessionToken(body.sessionToken);

  try {
    if (typeof body.placeId === "string") {
      const placeId = body.placeId.trim();

      if (!/^[\w-]{1,300}$/.test(placeId)) {
        return NextResponse.json(
          {
            error: {
              code: "invalid-argument",
              message: "That place couldn't be found.",
            },
          },
          { status: 400 }
        );
      }

      const pickedName =
        typeof body.name === "string" ? body.name.slice(0, 100) : null;
      const location = await lookupCity(placeId, sessionToken, pickedName);

      if (!location) {
        return NextResponse.json(
          {
            error: {
              code: "not-found",
              message:
                "We couldn't read a city and country from that place. Try another, or type it in.",
            },
          },
          { status: 422 }
        );
      }

      return NextResponse.json({ location });
    }

    const input = typeof body.input === "string" ? body.input.trim() : "";

    if (input.length < 2 || input.length > 100) {
      return NextResponse.json({ suggestions: [] });
    }

    return NextResponse.json({
      suggestions: await searchCities(input, sessionToken),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: {
          code: "places-unavailable",
          message: "City search isn't working right now. Type your city instead.",
        },
      },
      { status: 502 }
    );
  }
}
