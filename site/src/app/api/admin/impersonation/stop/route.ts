import { NextResponse } from "next/server";

import { stopImpersonation } from "@/lib/admin/impersonation";
import { handleAdminRouteError, requireAdminSession } from "@/lib/admin/route";

export async function POST(request: Request) {
  try {
    const decodedToken = await requireAdminSession();
    const body = (await request.json().catch(() => ({}))) as {
      targetUid?: unknown;
    };
    const targetUid =
      typeof body.targetUid === "string" ? body.targetUid.slice(0, 128) : "";
    return NextResponse.json(await stopImpersonation(decodedToken, targetUid));
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
