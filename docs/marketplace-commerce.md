# EduthArt marketplace commerce

EduthArt uses a one-artist-per-checkout marketplace model built on Stripe-hosted Checkout. This document is the implementation and operations reference for the model as a whole; see [Implementation status](#implementation-status) for what is built today, and [site/docs/commerce-setup.md](../site/docs/commerce-setup.md) for the keys and webhook endpoint it needs.

## Buyer flow

1. A public product-page visit records an aggregate artwork view.
2. A signed-in buyer may save the artwork to a wishlist or add it to a persistent cart.
3. Checkout reloads all price and availability data on the server and creates a temporary reservation for each original.
4. Shippo calculates shipping from the artist's origin and packed parcel to the buyer's destination.
5. The server creates a Stripe Checkout Session and redirects the buyer to Stripe.
6. Stripe webhooks confirm payment. A browser redirect is never accepted as proof of payment.
7. Fulfillment marks the artwork sold, creates an immutable order snapshot, clears carts, notifies the artist, and begins label creation.

## Core rules

- One artist per checkout.
- Original artwork has quantity one.
- Wishlist and cart writes require authentication.
- Aggregate save counts are updated transactionally and idempotently.
- Prices, seller IDs, inventory, fees, and shipping are always recalculated server-side.
- Checkout reservations expire and are released when payment is abandoned.
- Webhook fulfillment must be safe to run more than once.
- Stripe and Shippo credentials are server-only secrets.

## Required platform decisions

- EduthArt application fee.
- Merchant/business-of-record position.
- Refund, cancellation, dispute, tax, and payout policies.
- Reservation duration.
- Supported seller and buyer countries.
- Shipping insurance and signature thresholds.

## Implementation status

Built:

- Persistent cart, one artist per checkout, and server-side reload of price, availability, and seller at checkout.
- A thirty-minute reservation per original, taken before Stripe is involved and released when a checkout expires or is abandoned.
- Stripe-hosted Checkout, plus saved cards through Checkout in setup mode.
- Signature-verified webhook fulfilment, and an independent server-side verification from the success page. Both run the same idempotent path; the browser redirect is never accepted as proof of payment.
- Immutable order snapshots, purchase history, printable invoices, and buyer, seller, and saved-artwork notifications.
- Wishlist and cart writes require authentication, and aggregate save counts are updated atomically.

Not built:

- Stripe Connect destination charges. The platform is currently the merchant of record and there is no artist payout or application fee; artists are not onboarded as connected accounts.
- Shippo. Shipping uses the artist's own stated domestic rate from their listing, not live rates, and no labels or tracking are created.
- Tax calculation, refunds through Stripe, and dispute handling.

## Primary references

- [Stripe destination charges](https://docs.stripe.com/connect/destination-charges)
- [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [Stripe Checkout lifecycle](https://docs.stripe.com/payments/checkout/how-checkout-works)
- [Shippo platform integration paths](https://docs.goshippo.com/docs/Guides_general/integration-paths)
- [Shippo shipments and rates](https://docs.goshippo.com/docs/Shipments/Shipments)
- [Shippo tracking webhooks](https://docs.goshippo.com/docs/Tracking/Webhooks)
