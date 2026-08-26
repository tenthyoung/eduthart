import { NextResponse } from "next/server";

import { getOrder } from "@/lib/commerce/orders";
import { apiError, withSession } from "@/lib/api/handler";

export function GET(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  return withSession(request, async (session) => {
    const { orderId } = await context.params;
    const order = await getOrder(orderId);

    if (!order) {
      return apiError("That order could not be found.", 404, "not-found");
    }

    // Both sides of the sale can open the order: the collector to track it, the
    // artist to see where to ship it.
    if (order.buyerUid !== session.uid && order.sellerUid !== session.uid) {
      return apiError(
        "That order belongs to another account.",
        403,
        "permission-denied"
      );
    }

    return NextResponse.json({
      order,
      role: order.sellerUid === session.uid ? "seller" : "buyer",
    });
  });
}
