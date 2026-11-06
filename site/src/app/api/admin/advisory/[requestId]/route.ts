import { NextResponse } from "next/server";

import {
  AdvisoryInputError,
  setAdvisoryRequestStatus,
} from "@/lib/advisory/requests";
import { handleAdminRouteError, requireAdminSession } from "@/lib/admin/route";
import { AdminRouteError, requireAdmin } from "@/lib/admin/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    await requireAdmin(await requireAdminSession());
    const body = (await request.json()) as { status?: unknown };
    const { requestId } = await params;
    const item = await setAdvisoryRequestStatus(
      requestId,
      typeof body.status === "string" ? body.status : ""
    );
    return NextResponse.json({ item });
  } catch (error) {
    return handleAdminRouteError(
      error instanceof AdvisoryInputError
        ? new AdminRouteError("invalid-argument", error.message, 400)
        : error
    );
  }
}
