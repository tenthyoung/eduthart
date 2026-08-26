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

## Resend

Notification emails go out through Resend, which the contact form already uses.

- `RESEND_API_KEY` enables sending. Without it, notifications are still written
  to the in-app centre and only the email is skipped.
- `RESEND_FROM_EMAIL` sets the sender.
- `NEXT_PUBLIC_SITE_URL` is used for the absolute links inside emails and
  invoices, so set it per environment.

## Apple sign-in

Sign in with Apple needs enabling before the button works:

1. Firebase Console -> Authentication -> Sign-in method -> Apple.
2. Supply the Services ID, Apple Team ID, key ID, and private key from your
   Apple Developer account.
3. Add the Firebase callback URL to the Services ID's Return URLs.

Until it is enabled, Firebase returns `auth/operation-not-allowed` and the
button reports that the method is not enabled yet.

Apple only returns a name on the very first authorization and never returns a
username, location, or biography, so a federated sign-up lands on `/welcome` to
collect the rest.

## Still to do

The plan in [marketplace-commerce.md](./marketplace-commerce.md) also calls for
Stripe Connect destination charges so artists are paid directly, and Shippo for
live shipping rates. Neither is built: today the platform is the merchant of
record and shipping uses the artist's own stated domestic rate.
