import Stripe from "stripe";

let client: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Stripe is created lazily so a build or a page render without keys does not
 * fail. Every checkout entry point checks isStripeConfigured() first and shows
 * a setup notice instead of throwing at the collector.
 */
export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Payment checkout is not configured yet.");
  }

  if (!client) {
    client = new Stripe(secretKey);
  }

  return client;
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}
