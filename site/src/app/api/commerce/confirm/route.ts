import { NextResponse } from "next/server";

import { buildE2EPaidSession, isE2ESessionId } from "@/lib/commerce/e2e-payments";
import { fulfillCheckoutSession } from "@/lib/commerce/fulfillment";
import { getStripeClient, isStripeConfigured } from "@/lib/commerce/stripe";
import { apiError, withSession } from "@/lib/api/handler";

/**
 * Confirm an order from the success page.
 *
 * The browser redirect is never treated as proof of payment: the session is
 * re-fetched from Stripe and only its payment_status counts. This exists so a
 * collector sees their order immediately even when the webhook has not landed
 * yet, and it shares the same idempotent fulfilment path.
 */
export function POST(request: Request) {
  return withSession(request, async (session) => {
    const body = (await request.json().catch(() => ({}))) as { sessionId?: string };

    if (!body.sessionId) {
      return apiError("A checkout session is required.", 400);
    }

    if (!isE2ESessionId(body.sessionId) && !isStripeConfigured()) {
      return apiError("Payment checkout is not configured yet.", 503, "unavailable");
    }

    const checkoutSession = isE2ESessionId(body.sessionId)
      ? buildE2EPaidSession(body.sessionId)
      : await getStripeClient().checkout.sessions.retrieve(body.sessionId);
    const order = await fulfillCheckoutSession(checkoutSession);

    if (!order) {
      return apiError("That order could not be found.", 404, "not-found");
    }

    if (order.buyerUid !== session.uid) {
      return apiError("That order belongs to another account.", 403, "permission-denied");
    }

    return NextResponse.json({ order });
  });
}
