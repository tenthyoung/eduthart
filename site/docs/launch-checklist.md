# Launch checklist

What has to be true before EduthArt takes real money. Items marked **checked**
were looked at from outside on 2026-11-05 (public DNS, the live site, the code).
Everything else lives in a dashboard or needs a decision, so it is for a person
to tick off. Tracker: EDUTHA-82.

Setup details for each service are in [commerce-setup.md](commerce-setup.md);
the model behind the shop is in [../../docs/marketplace-commerce.md](../../docs/marketplace-commerce.md).

## Domain

- [x] **Checked:** `www.eduthart.com` serves the site over HTTPS on Vercel.
- [x] **Checked:** `eduthart.com` redirects (308) to `www.eduthart.com`, so
      **`www` is the canonical host.**
- [ ] Set `NEXT_PUBLIC_SITE_URL=https://www.eduthart.com` in Vercel
      (Production). Today it is unset: the live share card points at
      `https://eduthart.com/...`, which redirects. The code fallback now
      defaults to `www`, but set the variable so it is explicit. Emails link to
      this too.
- [ ] Firebase Console > Authentication > Settings > Authorized domains lists
      `www.eduthart.com` and `eduthart.com`. Without it, Google sign-in and
      email-link flows fail on the live domain.
- [ ] Firebase email action URL is `https://www.eduthart.com/auth/action`.

## Vercel plan

- [ ] Resolve HENDEC-55. A shop that takes payments is commercial use, which
      Vercel's Hobby plan does not allow. Move to Pro before launch.

## Stripe (payments)

- [ ] `STRIPE_SECRET_KEY` in Vercel Production is a **live** key (`sk_live_...`).
- [ ] A live-mode webhook endpoint points at
      `https://www.eduthart.com/api/commerce/webhook`, subscribed to the four
      `checkout.session.*` events in [commerce-setup.md](commerce-setup.md), and
      its signing secret is `STRIPE_WEBHOOK_SECRET` (live, not the test one).
- [ ] Stripe account is activated: business details, bank account for payouts.
- [x] **Checked:** the webhook route exists and rejects plain GETs (405).
- [ ] Decide the marketplace questions in `docs/marketplace-commerce.md` under
      "Required platform decisions". Settled: 33% commission and EduthArt as
      merchant of record. Still open: payout method and timing, legal entity,
      refund / dispute / tax policy. The code does not settle these.

## Shippo (shipping)

- [ ] `SHIPPO_API_TOKEN` is a live token (`shippo_live_...`).
- [ ] At least one carrier account is connected, or checkout only offers the
      artist's own stated rate.
- [ ] `SHIPPO_WEBHOOK_SECRET` is set and the Track Updated webhook points at
      `https://www.eduthart.com/api/commerce/shipping-webhook?token=<secret>`.

## Email (Resend)

The code sends as `EduthArt <support@eduthart.com>` through Resend, while
`support@eduthart.com` itself is a Zoho mailbox.

- [ ] `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set in Vercel Production.
- [ ] The sending domain is **verified in Resend**. **Checked, and it looks
      unfinished:** public DNS for `eduthart.com` has an SPF record that names
      only Zoho (`v=spf1 include:zohomail.com ~all`), no DMARC record, and no
      Resend DKIM or `send.` records at the usual names. Without them, order
      and account emails are likely to land in spam or be rejected. Add the
      records Resend lists for the domain, merge Resend into the one SPF record
      (a domain may have only one), and add a DMARC record.
- [ ] Send a real test email to a Gmail and an Outlook address and confirm it
      reaches the inbox.
- [ ] `CONTACT_EMAIL` / the contact form delivers to a monitored inbox.

## Accounts and security

- [ ] Firebase Admin credentials (`FIREBASE_ADMIN_PROJECT_ID`,
      `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`) are set in
      Vercel Production for the production Firebase project.
- [ ] Decide whether two-factor sign-in gates launch. It is built (PR #27) but
      unusable until Firebase is upgraded to Identity Platform and
      `node scripts/totp-mfa-config.mjs --enable` is run (EDUTHA-12, EDUTHA-13).
- [ ] EDUTHA-75: recovery phone and email set on the Zoho and Gmail accounts.

## Legal pages

- [x] **Checked:** privacy policy, terms of service and the refund policy all
      load and carry a "Last Updated: July 1, 2026" date.
- [ ] **Not ready, needs a decision:** the terms and refund pages talk about
      subscriptions, in-app billing and "Apple, Google and other payment
      providers". That reads like another product's boilerplate, not a shop
      selling one-of-a-kind physical originals from independent artists. They
      say nothing on shipping, returns of artwork, damage in transit, authenticity,
      or what happens when an artist and a buyer disagree. Have the policy
      written or reviewed for the marketplace model (ideally by a lawyer), then
      update the three pages. The privacy policy should also name Stripe,
      Shippo, Resend and Firebase as processors.

## The real test

- [ ] One real end-to-end purchase on production with a live card: add to
      cart, checkout, Stripe payment, webhook, order appears in the account,
      artwork marked sold, buyer and artist emails arrive, label is bought.
- [ ] Refund that purchase in Stripe and confirm the order and artwork status
      do the right thing.

## Already in place

- [x] Share card and `og:image` on every page (EDUTHA-80), live on production.
- [x] `robots.txt` and `sitemap.xml` (EDUTHA-81). Open `/sitemap.xml` on
      production and confirm artworks and artists are listed; they could not be
      checked without Firebase credentials locally.
- [x] Unknown URLs return 404. Before this checklist they returned a 500,
      because the blog-post route crashed on a missing post.
