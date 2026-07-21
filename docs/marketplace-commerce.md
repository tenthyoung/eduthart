# EduthArt marketplace commerce

EduthArt will use a one-artist-per-checkout marketplace model built on Stripe Connect destination charges and Stripe-hosted Checkout. This document is an implementation and operations reference; it does not mean payment checkout is already enabled.

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

## Primary references

- [Stripe destination charges](https://docs.stripe.com/connect/destination-charges)
- [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [Stripe Checkout lifecycle](https://docs.stripe.com/payments/checkout/how-checkout-works)
- [Shippo platform integration paths](https://docs.goshippo.com/docs/Guides_general/integration-paths)
- [Shippo shipments and rates](https://docs.goshippo.com/docs/Shipments/Shipments)
- [Shippo tracking webhooks](https://docs.goshippo.com/docs/Tracking/Webhooks)
