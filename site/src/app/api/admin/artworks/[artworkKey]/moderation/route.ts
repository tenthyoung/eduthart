import { NextResponse } from "next/server";

import { moderateArtwork } from "@/lib/admin/moderation";
import { handleAdminRouteError, requireAdminSession } from "@/lib/admin/route";
import { requireAdmin } from "@/lib/admin/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ artworkKey: string }> }
) {
  try {
    const decodedToken = await requireAdminSession();
    const access = await requireAdmin(decodedToken);
    const body = await request.json();
    const { artworkKey } = await params;
    const result = await moderateArtwork({
      action: body?.action?.toString() ?? "",
      artworkKey: decodeURIComponent(artworkKey),
      moderatorUid: access.uid,
      reason: body?.reason?.toString().trim() ?? "",
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
