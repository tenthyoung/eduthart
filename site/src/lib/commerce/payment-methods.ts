import { loadAccountProfile, saveAccountProfile } from "@/lib/auth/profile-store";
import { getStripeClient } from "@/lib/commerce/stripe";
import { getRootDocument, saveRootDocument } from "@/lib/store/document-store";

const STRIPE_CUSTOMERS_COLLECTION = "stripe_customers";

export type SavedPaymentMethod = {
  brand: string;
  expMonth: number;
  expYear: number;
  id: string;
  isDefault: boolean;
  last4: string;
};

/**
 * Find or create the Stripe customer behind an EduthArt account.
 *
 * Cards are only ever held by Stripe; EduthArt stores the customer id so a
 * collector can see and remove the methods Stripe saved for them.
 */
export async function ensureStripeCustomer({
  email,
  name,
  uid,
}: {
  email: string | null;
  name: string | null;
  uid: string;
}) {
  const existing = await getRootDocument(STRIPE_CUSTOMERS_COLLECTION, uid);

  if (existing && typeof existing.customerId === "string" && existing.customerId) {
    return existing.customerId;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { eduthartUid: uid },
    name: name ?? undefined,
  });

  await saveRootDocument(STRIPE_CUSTOMERS_COLLECTION, uid, { customerId: customer.id });
  return customer.id;
}

export async function findStripeCustomerId(uid: string) {
  const existing = await getRootDocument(STRIPE_CUSTOMERS_COLLECTION, uid);
  return existing && typeof existing.customerId === "string" ? existing.customerId : null;
}

export async function listPaymentMethods(uid: string): Promise<SavedPaymentMethod[]> {
  const customerId = await findStripeCustomerId(uid);

  if (!customerId) {
    return [];
  }

  const stripe = getStripeClient();
  const [methods, customer] = await Promise.all([
    stripe.paymentMethods.list({ customer: customerId, type: "card" }),
    stripe.customers.retrieve(customerId),
  ]);

  const defaultMethodId =
    !customer.deleted && typeof customer.invoice_settings?.default_payment_method === "string"
      ? customer.invoice_settings.default_payment_method
      : null;

  return methods.data
    .filter((method) => method.card)
    .map((method) => ({
      brand: method.card?.brand ?? "card",
      expMonth: method.card?.exp_month ?? 0,
      expYear: method.card?.exp_year ?? 0,
      id: method.id,
      isDefault: method.id === defaultMethodId,
      last4: method.card?.last4 ?? "____",
    }));
}

export async function setDefaultPaymentMethod(uid: string, paymentMethodId: string) {
  const customerId = await findStripeCustomerId(uid);

  if (!customerId) {
    throw new Error("No saved payment methods yet.");
  }

  await getStripeClient().customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  return listPaymentMethods(uid);
}

export async function removePaymentMethod(uid: string, paymentMethodId: string) {
  const customerId = await findStripeCustomerId(uid);
  const stripe = getStripeClient();
  const method = await stripe.paymentMethods.retrieve(paymentMethodId);

  // Detaching by id alone would let anyone remove anyone's card.
  if (!customerId || method.customer !== customerId) {
    throw new Error("That payment method is not on your account.");
  }

  await stripe.paymentMethods.detach(paymentMethodId);
  return listPaymentMethods(uid);
}

/**
 * Create a Stripe Checkout session in setup mode so a collector can save a card
 * without buying anything.
 */
export async function createPaymentMethodSetupSession({
  origin,
  uid,
}: {
  origin: string;
  uid: string;
}) {
  const profile = await loadAccountProfile(uid);
  const customerId = await ensureStripeCustomer({
    email: profile?.email ?? null,
    name: profile?.displayName ?? null,
    uid,
  });

  const session = await getStripeClient().checkout.sessions.create({
    cancel_url: `${origin}/account/payment-methods?cancelled=1`,
    customer: customerId,
    mode: "setup",
    success_url: `${origin}/account/payment-methods?saved=1`,
  });

  return session.url;
}

export async function forgetStripeCustomer(uid: string) {
  const customerId = await findStripeCustomerId(uid);

  if (!customerId) {
    return;
  }

  await getStripeClient().customers.del(customerId).catch(() => undefined);
  await saveRootDocument(STRIPE_CUSTOMERS_COLLECTION, uid, { customerId: "" });
  await saveAccountProfile(uid, { updatedAt: new Date().toISOString() });
}
