import { NextResponse } from "next/server";

import { handleAdminRouteError, requireAdminSession } from "@/lib/admin/route";
import { listModerationQueue, requireAdmin } from "@/lib/admin/server";

export async function GET() {
  try {
    const decodedToken = await requireAdminSession();
    await requireAdmin(decodedToken);
    const items = await listModerationQueue();
    return NextResponse.json({ items });
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
