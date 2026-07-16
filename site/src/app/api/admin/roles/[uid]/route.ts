import { NextResponse } from "next/server";

import { handleAdminRouteError, requireAdminSession } from "@/lib/admin/route";
import { requireSuperAdmin, revokeAdminRole } from "@/lib/admin/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  try {
    const decodedToken = await requireAdminSession();
    const access = await requireSuperAdmin(decodedToken);
    const { uid } = await params;
    const result = await revokeAdminRole(access.uid, uid);
    return NextResponse.json(result);
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
