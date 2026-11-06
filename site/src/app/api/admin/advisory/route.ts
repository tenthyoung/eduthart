import { NextResponse } from "next/server";

import { listAdvisoryInbox } from "@/lib/advisory/requests";
import { handleAdminRouteError, requireAdminSession } from "@/lib/admin/route";
import { requireAdmin } from "@/lib/admin/server";

export async function GET() {
  try {
    await requireAdmin(await requireAdminSession());
    return NextResponse.json({ items: await listAdvisoryInbox() });
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
