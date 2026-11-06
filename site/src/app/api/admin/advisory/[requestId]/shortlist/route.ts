import { NextResponse } from "next/server";

import {
  AdvisoryInputError,
  sendAdvisoryShortlist,
} from "@/lib/advisory/requests";
import { handleAdminRouteError, requireAdminSession } from "@/lib/admin/route";
import { AdminRouteError, requireAdmin } from "@/lib/admin/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const access = await requireAdmin(await requireAdminSession());
    const body = (await request.json()) as {
      message?: unknown;
      picks?: unknown;
    };
    const { requestId } = await params;
    const result = await sendAdvisoryShortlist(access.uid, requestId, {
      message: typeof body.message === "string" ? body.message : "",
      picks: Array.isArray(body.picks)
        ? body.picks.filter((pick): pick is string => typeof pick === "string")
        : [],
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleAdminRouteError(
      error instanceof AdvisoryInputError
        ? new AdminRouteError("invalid-argument", error.message, 400)
        : error
    );
  }
}
