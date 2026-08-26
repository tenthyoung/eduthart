import { NextResponse } from "next/server";

import {
  createPaymentMethodSetupSession,
  listPaymentMethods,
  removePaymentMethod,
  setDefaultPaymentMethod,
} from "@/lib/commerce/payment-methods";
import { isStripeConfigured } from "@/lib/commerce/stripe";
import { apiError, getRequestOrigin, withSession } from "@/lib/api/handler";

function requireStripe() {
  return isStripeConfigured()
    ? null
    : apiError("Saved payment methods need Stripe to be configured.", 503, "unavailable");
}

export function GET(request: Request) {
  return withSession(request, async (session) => {
    // Without Stripe there are simply no saved cards, which is not an error.
    if (!isStripeConfigured()) {
      return NextResponse.json({ configured: false, paymentMethods: [] });
    }

    return NextResponse.json({
      configured: true,
      paymentMethods: await listPaymentMethods(session.uid),
    });
  });
}

export function POST(request: Request) {
  return withSession(request, async (session) => {
    const unavailable = requireStripe();

    if (unavailable) {
      return unavailable;
    }

    const url = await createPaymentMethodSetupSession({
      origin: getRequestOrigin(request),
      uid: session.uid,
    });

    if (!url) {
      return apiError("Stripe did not return a setup URL.", 502, "bad-gateway");
    }

    return NextResponse.json({ url });
  });
}

export function PATCH(request: Request) {
  return withSession(request, async (session) => {
    const unavailable = requireStripe();

    if (unavailable) {
      return unavailable;
    }

    const body = (await request.json()) as { paymentMethodId?: string };

    if (!body.paymentMethodId) {
      return apiError("A payment method is required.", 400);
    }

    return NextResponse.json({
      configured: true,
      paymentMethods: await setDefaultPaymentMethod(session.uid, body.paymentMethodId),
    });
  });
}

export function DELETE(request: Request) {
  return withSession(request, async (session) => {
    const unavailable = requireStripe();

    if (unavailable) {
      return unavailable;
    }

    const body = (await request.json()) as { paymentMethodId?: string };

    if (!body.paymentMethodId) {
      return apiError("A payment method is required.", 400);
    }

    return NextResponse.json({
      configured: true,
      paymentMethods: await removePaymentMethod(session.uid, body.paymentMethodId),
    });
  });
}
