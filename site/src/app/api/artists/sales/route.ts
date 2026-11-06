import { NextResponse } from "next/server";

import { withSession } from "@/lib/api/handler";
import { loadSalesDashboard } from "@/lib/artists/sales-dashboard-store";
import { loadAccountProfile } from "@/lib/auth/profile-store";

/**
 * The signed-in artist's sales, earnings and saves.
 *
 * Always scoped to the session's own uid, never to a username in the URL, so
 * one artist can never read another's orders by editing the address. The
 * artist's own username comes back too, so the page can move them to their own
 * address instead of showing their figures under someone else's name.
 */
export function GET(request: Request) {
  return withSession(request, async (session) => {
    const [dashboard, profile] = await Promise.all([
      loadSalesDashboard(session.uid),
      loadAccountProfile(session.uid),
    ]);

    return NextResponse.json({
      dashboard,
      username: profile?.username ?? null,
    });
  });
}
