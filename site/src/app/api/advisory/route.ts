import { NextResponse } from "next/server";

import { apiError } from "@/lib/api/handler";
import {
  AdvisoryInputError,
  createAdvisoryRequest,
  parseAdvisoryRequestInput,
} from "@/lib/advisory/requests";
import { getAuthenticatedSession } from "@/lib/auth/server-session";

/**
 * Who is asking, if anyone.
 *
 * The form works signed out. A signed-in buyer's request is tied to their
 * account so the advisor can see what they have saved; a stale or bad token
 * is treated as signed out rather than refusing the request.
 */
async function readOptionalUid(request: Request) {
  if (!request.headers.get("authorization")) {
    return null;
  }

  try {
    return (await getAuthenticatedSession(request)).uid;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError("That request could not be read.", 400);
  }

  // A hidden field people never see. Bots fill it; pretend all went well.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ confirmationSent: true, id: null });
  }

  let input;

  try {
    input = parseAdvisoryRequestInput(body);
  } catch (error) {
    if (error instanceof AdvisoryInputError) {
      return NextResponse.json(
        {
          error: {
            code: "invalid-argument",
            field: error.field,
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    throw error;
  }

  try {
    const result = await createAdvisoryRequest(
      input,
      await readOptionalUid(request)
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Unable to save advisory request", error);
    return apiError(
      "We couldn't send your request just now. Nothing you typed has been lost; please try again in a moment.",
      500,
      "internal"
    );
  }
}
