import { NextResponse } from "next/server";

import { handleAdminRouteError, requireAdminSession } from "@/lib/admin/route";
import { getPublicDeckDetails, requireAdmin } from "@/lib/admin/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicDeckId: string }> },
) {
  try {
    const decodedToken = await requireAdminSession();
    await requireAdmin(decodedToken);
    const { publicDeckId } = await params;
    const deck = await getPublicDeckDetails(publicDeckId);
    return NextResponse.json(deck);
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
