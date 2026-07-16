import { NextResponse } from "next/server";

import { handleAdminRouteError, requireAdminSession } from "@/lib/admin/route";
import { grantAdminRole, listAdminRoles, requireAdmin, requireSuperAdmin } from "@/lib/admin/server";

export async function GET() {
  try {
    const decodedToken = await requireAdminSession();
    await requireAdmin(decodedToken);
    const items = await listAdminRoles();
    return NextResponse.json({ items });
  } catch (error) {
    return handleAdminRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const decodedToken = await requireAdminSession();
    const access = await requireSuperAdmin(decodedToken);
    const body = await request.json();
    const role =
      body?.role?.toString() === "super_admin" ? "super_admin" : "admin";
    const result = await grantAdminRole(
      access.uid,
      body?.email?.toString() ?? "",
      role,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
