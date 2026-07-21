import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

import { AdminCard, AdminPage } from "@/components/admin/admin-ui";

const steps = [
  ["1. Discover", "A public product page records an artwork view. Signed-in buyers can save the piece or add it to their cart."],
  ["2. Reserve", "Starting checkout atomically reserves the original for a short window so two buyers cannot purchase the same piece."],
  ["3. Pay", "The server creates a Stripe Checkout Session. The browser redirects to Stripe’s hosted payment page; card data never passes through EduthArt."],
  ["4. Confirm", "Stripe webhooks—not the browser redirect—confirm payment. Fulfillment must be idempotent so repeated webhook delivery cannot create duplicate orders."],
  ["5. Fulfill", "EduthArt marks the artwork sold, creates the order, clears it from carts, notifies the artist, and begins the Shippo shipping workflow."],
  ["6. Settle", "Stripe transfers the artist’s proceeds to their connected account and retains EduthArt’s configured application fee."],
];

export default function AdminDocumentationPage() {
  return (
    <AdminPage
      title="Marketplace documentation"
      description="Internal operating and implementation guide for artwork discovery, saves, carts, checkout, artist payouts, and fulfillment. Admin access is enforced by the surrounding admin route guard."
    >
      <AdminCard className="border-amber-200 bg-amber-50/90">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-amber-800">Implementation status</p>
        <p className="mt-3 text-sm leading-6 text-amber-950">
          Product listings and purchase inquiries are live. Wishlist, view metrics, persistent carts, Stripe Connect onboarding, payment checkout, orders, and webhooks are the approved architecture but are not yet production-enabled.
        </p>
      </AdminCard>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminCard>
          <h3 className="text-2xl font-semibold tracking-[-0.04em]">Approved commerce model</h3>
          <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
            <p><strong className="text-foreground">Payment provider:</strong> Stripe Connect with Stripe-hosted Checkout.</p>
            <p><strong className="text-foreground">Cart rule:</strong> one artist per checkout. A buyer can save work from any artist, but checkout groups or limits cart items by artist.</p>
            <p><strong className="text-foreground">Charge model:</strong> destination charges. EduthArt creates the charge, sends the artist’s proceeds to their connected account, and may retain an application fee.</p>
            <p><strong className="text-foreground">Inventory:</strong> an original has quantity one. Checkout creates a temporary reservation; only a verified successful payment changes availability to sold.</p>
            <p><strong className="text-foreground">Shipping:</strong> the artist supplies origin and packed parcel data, the buyer supplies the destination at checkout, and Shippo returns live rates before payment.</p>
          </div>
        </AdminCard>

        <AdminCard>
          <h3 className="text-xl font-semibold tracking-[-0.04em]">Why one artist per checkout?</h3>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            A destination charge has one connected-account destination. Keeping each checkout to one artist makes payouts, shipping, refunds, disputes, and order ownership significantly clearer. A future multi-artist checkout would require separate charges and transfers or multiple checkout sessions.
          </p>
        </AdminCard>
      </div>

      <AdminCard>
        <h3 className="text-2xl font-semibold tracking-[-0.04em]">Purchase lifecycle</h3>
        <ol className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {steps.map(([title, description]) => (
            <li key={title} className="rounded-2xl border border-black/5 bg-black/[0.02] p-5">
              <p className="font-semibold text-foreground">{title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </AdminCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard>
          <h3 className="text-xl font-semibold tracking-[-0.04em]">Views and wishlists</h3>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-muted-foreground">
            <li>Each public artwork has aggregate <code>viewCount</code> and <code>saveCount</code> metrics.</li>
            <li>Wishlist membership is stored per authenticated user; the aggregate save count is updated transactionally.</li>
            <li>Saving the same artwork twice must be idempotent and must not increase the count twice.</li>
            <li>Views should be rate-limited or deduplicated by a short-lived anonymous viewer key to reduce refresh spam.</li>
            <li>Artists see aggregate counts only—not the identities of users who saved a piece.</li>
          </ul>
        </AdminCard>

        <AdminCard>
          <h3 className="text-xl font-semibold tracking-[-0.04em]">Cart and reservation rules</h3>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-muted-foreground">
            <li>Carts belong to authenticated buyers and store listing IDs, not trusted prices.</li>
            <li>The server reloads title, price, currency, seller, and availability when checkout begins.</li>
            <li>Original artwork quantity is always one; the buyer cannot adjust it.</li>
            <li>A reservation records buyer, artwork, expiration, and Checkout Session ID.</li>
            <li>An expired or abandoned Checkout Session releases the reservation.</li>
            <li>A paid order permanently marks the listing sold and removes it from every active cart.</li>
          </ul>
        </AdminCard>
      </div>

      <AdminCard>
        <h3 className="text-2xl font-semibold tracking-[-0.04em]">Stripe and Shippo setup checklist</h3>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Checklist title="Stripe Connect">
            <li>Create the EduthArt Stripe platform account.</li>
            <li>Choose the platform’s country, business-of-record, fee, refund, and dispute policies.</li>
            <li>Enable connected-account onboarding for artists and store each Stripe account ID privately.</li>
            <li>Configure server secrets and separate test/live webhook signing secrets.</li>
            <li>Handle checkout completion, async payment success/failure, expiration, refunds, and disputes.</li>
            <li>Never mark artwork sold from a success-page redirect alone.</li>
          </Checklist>
          <Checklist title="Shippo">
            <li>Obtain a Shippo Platform Account for marketplace merchants.</li>
            <li>Create or associate a managed Shippo account for each artist.</li>
            <li>Validate artist origin and buyer destination addresses.</li>
            <li>Collect packed dimensions, weight, handling time, and international customs details.</li>
            <li>Quote rates before creating Stripe Checkout and preserve the selected service on the order.</li>
            <li>Purchase the label only after verified payment and consume tracking webhooks.</li>
          </Checklist>
        </div>
      </AdminCard>

      <AdminCard>
        <h3 className="text-xl font-semibold tracking-[-0.04em]">Authoritative references</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Reference href="https://docs.stripe.com/connect/destination-charges" label="Stripe Connect destination charges" />
          <Reference href="https://docs.stripe.com/checkout/fulfillment" label="Stripe Checkout fulfillment and webhooks" />
          <Reference href="https://docs.stripe.com/payments/checkout/how-checkout-works" label="How Stripe Checkout works" />
          <Reference href="https://docs.goshippo.com/docs/Guides_general/integration-paths" label="Shippo marketplace integration paths" />
          <Reference href="https://docs.goshippo.com/docs/Shipments/Shipments" label="Shippo shipments and live rates" />
          <Reference href="https://docs.goshippo.com/docs/Tracking/Webhooks" label="Shippo tracking webhooks" />
        </div>
      </AdminCard>
    </AdminPage>
  );
}

function Checklist({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-5">
      <h4 className="font-semibold text-foreground">{title}</h4>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">{children}</ul>
    </div>
  );
}

function Reference({ href, label }: { href: string; label: string }) {
  return (
    <a className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-black/[0.02] px-4 py-3 text-sm font-medium transition-colors hover:bg-black/[0.05]" href={href} rel="noreferrer" target="_blank">
      {label}
      <ExternalLink className="size-4 shrink-0 text-primary" />
    </a>
  );
}
