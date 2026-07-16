import { NextResponse } from "next/server";

import { handleAdminRouteError, requireAdminSession } from "@/lib/admin/route";
import { requireAdmin, updateRefundRequestStatus } from "@/lib/admin/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ refundRequestId: string }> },
) {
  try {
    const decodedToken = await requireAdminSession();
    const access = await requireAdmin(decodedToken);
    const body = await request.json();
    const { refundRequestId } = await params;
    const result = await updateRefundRequestStatus(
      access.uid,
      refundRequestId,
      body?.status?.toString() ?? "",
      body?.adminNotes?.toString().trim() ?? "",
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
