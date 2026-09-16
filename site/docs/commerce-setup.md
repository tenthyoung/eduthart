# Commerce and notifications setup

What has to be configured for the buying flow and the notification centre to
work outside the test environment.

## Stripe

Checkout uses Stripe-hosted Checkout Sessions. Card details are entered on
Stripe's page and never reach EduthArt; the app stores only a customer id so a
collector can list and remove their saved cards.

1. Create a Stripe account and copy the **secret key** into `STRIPE_SECRET_KEY`.
   Use a test key (`sk_test_...`) anywhere but production.
2. Add a webhook endpoint pointing at `POST /api/commerce/webhook`, subscribed
   to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.expired`
   - `checkout.session.async_payment_failed`
3. Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`. The webhook
   route rejects any request it cannot verify against this, so payments are
   never recorded from an unsigned call.

Locally, forward events instead of creating an endpoint:

```bash
stripe listen --forward-to localhost:3000/api/commerce/webhook
```

Without Stripe keys the site still runs: the checkout button reports that
payments are not configured, and the saved-cards screen says there is nothing
to save.

### How a purchase is recorded

- Checkout reloads price, availability, and seller from the artist's studio and
  ignores what the browser sent.
- Each original is reserved for 30 minutes before Stripe is involved, so two
  collectors cannot reach the payment page for the same one-of-a-kind piece.
- Fulfilment marks the artwork sold, clears the cart, and notifies the buyer,
  the seller, and anyone who had saved the piece.
- The webhook and the success page both run the same fulfilment, which is safe
  to repeat: whichever arrives first wins and the other is a no-op. The browser
  redirect is never treated as proof of payment — the success page asks the
  server to re-fetch the session from Stripe.

## Shippo

Shipping rates, labels, and tracking come from Shippo.

1. Create a Shippo account and copy a **live or test API token** into
   `SHIPPO_API_TOKEN`. Test tokens (`shippo_test_...`) return the same rate
   shapes and issue labels that are never charged.
2. Connect at least one carrier account in the Shippo dashboard. With no carrier
   connected Shippo returns no rates, and checkout falls back to the artist's
   own stated rate.
3. Pick a long random string for `SHIPPO_WEBHOOK_SECRET`.
4. Add a Shippo webhook for **Track Updated** pointing at
   `POST /api/commerce/shipping-webhook?token=<that secret>`.

Without `SHIPPO_API_TOKEN` the site still sells: shipping is charged at the
artist's stated domestic rate, no label is bought, and the order's shipment
stays pending.

### What is quoted, and when it is not

- Rates are quoted at checkout from the artist's shipping origin to the
  collector's address, one parcel per artwork, and the cheapest rate in the
  order's currency is what the collector is charged.
- A parcel needs width, height, and weight. The listing form only requires width
  and height, so an artwork with no weight is never quoted — guessing would
  commit the artist to a price they never agreed to. Depth falls back to a 2 in
  (5 cm) minimum, because a packed flat piece is never zero-deep.
- Checkout is never blocked on Shippo. An unconfigured token, an unmeasured
  piece, a missing origin address, rates in another currency, or an outright
  failure all fall back to the artist's stated rate, and the reason is logged.

### Labels and tracking

- The label is bought during fulfilment, against the exact rate the collector
  was charged. It is the last thing fulfilment does and it never throws: the
  sale is already complete, and a carrier outage must not leave a paid order
  unfulfilled. A refused label is logged and the shipment stays pending.
- `signatureRequired` on the listing becomes signature confirmation on the
  label.
- The tracking webhook's shared secret only decides whether a request is worth
  acting on. The payload is never trusted for the status itself: the carrier and
  tracking number are used to re-fetch the parcel from Shippo, so a forged call
  cannot mark an order delivered.
- The buyer is told when the parcel first enters transit and when it is
  delivered. Both are deduped, so Shippo retries do not send twice.

## Resend

Notification emails go out through Resend, which the contact form already uses.

- `RESEND_API_KEY` enables sending. Without it, notifications are still written
  to the in-app centre and only the email is skipped.
- `RESEND_FROM_EMAIL` sets the sender.
- `NEXT_PUBLIC_SITE_URL` is used for the absolute links inside emails and
  invoices, so set it per environment.

## Google sign-in

Google is the only federated provider. It signs in through a popup, so every
domain the site is served from has to be on the Firebase allow list:

1. Firebase Console -> Authentication -> Settings -> Authorized domains.
2. Add each host that serves the app, including `www.eduthart.com` and the bare
   apex, plus any preview domain. `localhost` is allowed by default, but
   `127.0.0.1` is not -- they are different hosts to Firebase.

A domain that is missing returns `auth/unauthorized-domain` and the button
reports that Google sign-in is not authorized for the domain yet. The current
list can be read without the console:

```bash
curl -s "https://identitytoolkit.googleapis.com/v1/projects?key=$NEXT_PUBLIC_FIREBASE_API_KEY"
```

Google does not return a username, location, or biography, so a federated
sign-up lands on `/welcome` to collect the rest.

## Still to do

The plan in [marketplace-commerce.md](./marketplace-commerce.md) also calls for
Stripe Connect destination charges so artists are paid directly. That is not
built: today the platform is the merchant of record, and there is no artist
payout or application fee.
