import { NextResponse } from "next/server";

import { handleAdminRouteError, requireAdminSession } from "@/lib/admin/route";
import { moderateDeck, requireAdmin } from "@/lib/admin/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicDeckId: string }> },
) {
  try {
    const decodedToken = await requireAdminSession();
    const access = await requireAdmin(decodedToken);
    const body = await request.json();
    const { publicDeckId } = await params;
    const result = await moderateDeck(
      access.uid,
      publicDeckId,
      body?.action?.toString() as "warn" | "hide" | "remove",
      body?.reason?.toString().trim() ?? "",
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
