import { NextResponse } from "next/server";

import { withSession } from "@/lib/api/handler";
import { loadSalesDashboard } from "@/lib/artists/sales-dashboard-store";

/**
 * The signed-in artist's sales, earnings and saves.
 *
 * Always scoped to the session's own uid, never to a username in the URL, so
 * one artist can never read another's orders by editing the address.
 */
export function GET(request: Request) {
  return withSession(request, async (session) =>
    NextResponse.json({ dashboard: await loadSalesDashboard(session.uid) })
  );
}
