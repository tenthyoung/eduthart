import { NextResponse } from "next/server";

import { getArtworkModerationDetail } from "@/lib/admin/moderation";
import { handleAdminRouteError, requireAdminSession } from "@/lib/admin/route";
import { requireAdmin } from "@/lib/admin/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ artworkKey: string }> }
) {
  try {
    const decodedToken = await requireAdminSession();
    await requireAdmin(decodedToken);
    const { artworkKey } = await params;
    const artwork = await getArtworkModerationDetail(
      decodeURIComponent(artworkKey)
    );
    return NextResponse.json(artwork);
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
