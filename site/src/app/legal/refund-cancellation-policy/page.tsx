export default function RefundCancellationPolicy() {
  return (
    <div className="min-h-screen bg-background py-30 lg:py-40">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-4xl font-bold">
          Refund & Cancellation Policy
        </h1>
        <p className="mb-8 text-muted-foreground">Last Updated: July 1, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="mb-4 text-2xl font-bold">1. Subscription Basics</h2>
            <p>
              EduthArt offers subscription tiers for certain premium features.
              Subscription pricing and included features are described in the
              app and on the pricing page.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">2. Cancellation</h2>
            <p className="mb-4">
              If you purchased a subscription through Apple or Google, you can
              manage or cancel that subscription through the subscription
              settings of the store account you used for purchase.
            </p>
            <p>
              Canceling a subscription stops future renewals, but it does not
              automatically reverse charges that have already been processed.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">3. Refund Requests</h2>
            <p className="mb-4">
              EduthArt may provide an in-app refund request flow so users can
              explain the issue and track review status. If that flow is
              available, you should use it first for the fastest review.
            </p>
            <p>
              Submitting a request does not guarantee that a refund will be
              approved. We may ask for additional detail before reaching a
              decision.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              4. App Store Limitations
            </h2>
            <p>
              Apple, Google, and other payment providers control important parts
              of billing, renewal, and refund processing for purchases made
              through their systems. In some situations, only the store or
              payment provider can complete a refund or billing reversal.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">5. Review Timing</h2>
            <p>
              We aim to review refund requests reasonably promptly, but timing
              can vary depending on request volume, the information provided,
              store-provider rules, and whether additional investigation is
              needed.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">6. Contact</h2>
            <p>
              For billing or refund questions, contact{" "}
              <a
                href="mailto:support@eduthart.com"
                className="text-primary hover:underline"
              >
                support@eduthart.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
