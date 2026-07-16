import { NextResponse } from "next/server";

import { requireAdminSession, handleAdminRouteError } from "@/lib/admin/route";
import { getAdminAccessStatus } from "@/lib/admin/server";

export async function GET() {
  try {
    const decodedToken = await requireAdminSession();
    const access = await getAdminAccessStatus(decodedToken);
    return NextResponse.json(access);
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
