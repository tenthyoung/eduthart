import { NextResponse } from "next/server";

import { handleAdminRouteError, requireAdminSession } from "@/lib/admin/route";
import { requireAdmin, updateUserModerationState } from "@/lib/admin/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  try {
    const decodedToken = await requireAdminSession();
    const access = await requireAdmin(decodedToken);
    const body = await request.json();
    const { uid } = await params;
    const result = await updateUserModerationState(
      access.uid,
      uid,
      body?.action?.toString() ?? "",
      body?.reason?.toString().trim() ?? "",
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
