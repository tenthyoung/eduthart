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
      "Required platform decisions": application fee, who is the merchant of
      record, refund / dispute / tax / payout policy. The code does not settle
      these.

## Shippo (shipping)

- [ ] `SHIPPO_API_TOKEN` is a live token (`shippo_live_...`).
- [ ] At least one carrier account is connected, or checkout only offers the
      artist's own stated rate.
- [ ] `SHIPPO_WEBHOOK_SECRET` is set and the Track Updated webhook points at
      `https://www.eduthart.com/api/commerce/shipping-webhook?token=<secret>`.

## Email (Cloudflare Email Service)

The code sends as `EduthArt <support@eduthart.com>` through Cloudflare Email
Service (the `EMAIL` binding in `wrangler.jsonc`). `support@eduthart.com`
itself is still a Zoho mailbox, which receives replies.

- [x] eduthart.com is onboarded in Email Sending (EDUTHA-106, 2026-11-06).
      **Checked:** public DNS has the `cf-bounce` MX and SPF, the
      `cf-bounce._domainkey` DKIM key, and `_dmarc` at `p=reject`. Zoho's main
      MX, SPF and `zmail._domainkey` DKIM are untouched.
- [x] The main SPF record also names Cloudflare
      (`v=spf1 include:zohomail.com include:_spf.mx.cloudflare.net ~all`,
      2026-11-06). Without it, Zoho quarantined site mail addressed to
      support@ as a spoof of its own domain, even though DMARC passed.
- [x] Real test sends (2026-11-06, via `wrangler dev`): a contact-form message
      reached a Google Workspace inbox with SPF, DKIM and DMARC passing, and
      reached the support@ Zoho inbox once the SPF record above was in place.
      Sending to an un-verified address worked, which needs Workers Paid.
- [ ] Send one to an Outlook / Hotmail address too.
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
      Shippo, Cloudflare and Firebase as processors.

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
