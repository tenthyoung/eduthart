import { NextResponse } from "next/server";

import { loadAccountProfile } from "@/lib/auth/profile-store";
import { createCheckoutSession } from "@/lib/commerce/checkout";
import { isE2ECheckout } from "@/lib/commerce/e2e-payments";
import { isStripeConfigured } from "@/lib/commerce/stripe";
import { apiError, getRequestOrigin, withSession } from "@/lib/api/handler";

export function POST(request: Request) {
  return withSession(request, async (session) => {
    if (!isStripeConfigured() && !isE2ECheckout()) {
      return apiError(
        "Payment checkout is not configured on this environment yet.",
        503,
        "unavailable"
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      billingAddressId?: string | null;
      savePaymentMethod?: boolean;
      shippingAddressId?: string | null;
    };
    const profile = await loadAccountProfile(session.uid);

    const { order, url } = await createCheckoutSession({
      billingAddressId: body.billingAddressId ?? null,
      buyerEmail: profile?.email ?? session.user.email,
      buyerName: profile?.displayName ?? session.user.displayName,
      buyerUid: session.uid,
      origin: getRequestOrigin(request),
      savePaymentMethod: body.savePaymentMethod === true,
      shippingAddressId: body.shippingAddressId ?? null,
    });

    if (!url) {
      return apiError(
        "Stripe did not return a checkout URL.",
        502,
        "bad-gateway"
      );
    }

    return NextResponse.json({ orderId: order.id, url });
  });
}
