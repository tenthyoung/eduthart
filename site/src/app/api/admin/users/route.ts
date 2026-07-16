import { NextResponse } from "next/server";

import { handleAdminRouteError, requireAdminSession } from "@/lib/admin/route";
import { requireAdmin, searchUsersForAdmin } from "@/lib/admin/server";

export async function GET(request: Request) {
  try {
    const decodedToken = await requireAdminSession();
    await requireAdmin(decodedToken);
    const { searchParams } = new URL(request.url);
    const items = await searchUsersForAdmin(searchParams.get("query") ?? "");
    return NextResponse.json({ items });
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
