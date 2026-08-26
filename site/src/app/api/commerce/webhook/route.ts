import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { fulfillCheckoutSession, releaseCheckoutSession } from "@/lib/commerce/fulfillment";
import { getStripeClient, getStripeWebhookSecret, isStripeConfigured } from "@/lib/commerce/stripe";

/**
 * Stripe's own account of what happened.
 *
 * The signature check is what makes this trustworthy, so an unsigned or
 * mis-signed request is rejected outright rather than being treated as a
 * payment. Handlers below must stay idempotent because Stripe retries.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const webhookSecret = getStripeWebhookSecret();
  const signature = request.headers.get("stripe-signature");

  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: "Missing webhook signature." }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Rejected a Stripe webhook with an invalid signature", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await fulfillCheckoutSession(event.data.object);
    }

    if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      await releaseCheckoutSession(event.data.object);
    }
  } catch (error) {
    // A 500 makes Stripe retry, which is what we want for a transient failure.
    console.error(`Unable to handle Stripe event ${event.type}`, error);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
