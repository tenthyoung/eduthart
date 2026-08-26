import { NextResponse } from "next/server";

import { listPurchases, listSales } from "@/lib/commerce/orders";
import { withSession } from "@/lib/api/handler";

export function GET(request: Request) {
  return withSession(request, async (session) => {
    const view = new URL(request.url).searchParams.get("view");

    if (view === "sales") {
      return NextResponse.json({ orders: await listSales(session.uid) });
    }

    return NextResponse.json({ orders: await listPurchases(session.uid) });
  });
}
