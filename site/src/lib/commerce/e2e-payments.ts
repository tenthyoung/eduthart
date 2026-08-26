import { isE2EAuthEnabled } from "@/lib/auth/e2e-store";
import type { FulfillableSession } from "@/lib/commerce/fulfillment";

/**
 * Payment stand-in for the end-to-end suite.
 *
 * The Playwright run has no Stripe keys and cannot open a hosted payment page,
 * so without this the purchase flow could only ever be tested up to the
 * redirect. Every entry point is guarded by isE2EAuthEnabled(), which is only
 * true when E2E_AUTH is set, so none of it is reachable in production. The
 * order, reservation, fulfilment, and notification paths are the real ones:
 * only the card charge is skipped.
 */
const E2E_SESSION_PREFIX = "e2e_session_";

export function isE2ECheckout() {
  return isE2EAuthEnabled();
}

export function buildE2ESessionId(orderId: string) {
  return `${E2E_SESSION_PREFIX}${orderId}`;
}

export function isE2ESessionId(sessionId: string) {
  return isE2EAuthEnabled() && sessionId.startsWith(E2E_SESSION_PREFIX);
}

export function buildE2EPaidSession(sessionId: string): FulfillableSession {
  return {
    id: sessionId,
    metadata: { orderId: sessionId.slice(E2E_SESSION_PREFIX.length) },
    payment_intent: null,
    payment_status: "paid",
  };
}
