import { NextResponse } from "next/server";

import { startImpersonation } from "@/lib/admin/impersonation";
import { handleAdminRouteError, requireAdminSession } from "@/lib/admin/route";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const decodedToken = await requireAdminSession();
    const { uid } = await params;
    return NextResponse.json(await startImpersonation(decodedToken, uid));
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
