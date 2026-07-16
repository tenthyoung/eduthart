import { NextResponse } from "next/server";

import { handleAdminRouteError, requireAdminSession } from "@/lib/admin/route";
import { getAdminUserDetails, requireAdmin } from "@/lib/admin/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  try {
    const decodedToken = await requireAdminSession();
    await requireAdmin(decodedToken);
    const { uid } = await params;
    const detail = await getAdminUserDetails(uid);
    return NextResponse.json(detail);
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
