import Link from "next/link";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background py-30 lg:py-40">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-4xl font-bold">Terms of Service</h1>
        <p className="mb-8 text-muted-foreground">Last Updated: July 1, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="mb-4 text-2xl font-bold">1. Scope and Acceptance</h2>
            <p>
              These Terms govern your access to and use of the EduthArt website,
              marketplace, artist listing tools, collector accounts, checkout,
              and related services.
            </p>
            <p>
              By creating an account, accessing, or using EduthArt, you agree to
              these Terms. If you do not agree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              2. Eligibility and Accounts
            </h2>
            <p className="mb-4">
              You must provide accurate information when creating an account and
              keep your login credentials secure. You are responsible for
              activity that occurs through your account.
            </p>
            <p>
              EduthArt is not directed to children under 13. If you are using
              the service on behalf of an organization, you represent that you
              have authority to bind that organization to these Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              3. What EduthArt Provides
            </h2>
            <p>
              EduthArt is an online marketplace where artists list original work
              and collectors buy it. We host listings and artist profiles, run
              checkout, arrange shipping, issue a certificate of authenticity
              for each original sold, and pay artists their share of each sale.
              Artists sell through EduthArt once their application to join is
              accepted.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              4. Purchases, Payments, and Fees
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Artists set the price of their work. Shipping is calculated at
                checkout from the artist&apos;s location and the buyer&apos;s
                delivery address, and shown before you pay.
              </li>
              <li>
                Payment is taken through our payment processor on a secure
                checkout page. An order is confirmed only once the processor
                tells us the payment succeeded.
              </li>
              <li>
                Each original is one of a kind. It is held for you briefly while
                you check out, and the hold is released if the checkout is
                abandoned.
              </li>
              <li>
                EduthArt keeps a commission on each sale, disclosed to artists
                when they list, and pays the artist the remainder.
              </li>
              <li>
                Questions about an order, a cancellation, or a refund go to{" "}
                <a
                  href="mailto:support@eduthart.com"
                  className="text-primary hover:underline"
                >
                  support@eduthart.com
                </a>
                . Requests are reviewed case by case, and the outcome can depend
                on the payment processor and on whether the work has shipped.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              5. Listings, Profiles, and Other Content
            </h2>
            <p className="mb-4">
              Artists retain copyright in the work they list, subject to the
              rights needed for us to host, process, store, display, and promote
              listings and profiles as part of the service, and to moderate
              them.
            </p>
            <p className="mb-4">
              When you list a work you confirm that you created it or hold the
              rights to sell it, that it contains no material you lack
              permission to use, that the listing is accurate, and that your AI
              disclosure is truthful. Collectors buy in reliance on those
              statements.
            </p>
            <p>
              If you publish a listing or profile, or share a collection by
              link, you understand that other users and visitors may be able to
              view that content and associated public profile details.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              6. Acceptable Use and Moderation
            </h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the service unlawfully or in a way that harms others.</li>
              <li>
                List work you do not have the right to sell, or misrepresent a
                work&apos;s authorship, edition, condition, or authenticity.
              </li>
              <li>Harass, impersonate, threaten, or abuse other users.</li>
              <li>
                Attempt to scrape, disrupt, probe, reverse engineer, or bypass
                service protections except where the law clearly permits it.
              </li>
              <li>
                Use EduthArt to distribute malware, spam, or other harmful
                material.
              </li>
            </ul>
            <p className="mt-4">
              We may investigate reports, take down or remove listings, disable
              selling, suspend accounts, or terminate access when we believe it
              is necessary to protect users, enforce these Terms, or comply with
              the law. Our{" "}
              <Link
                href="/legal/content-policy"
                className="text-primary hover:underline"
              >
                Content Policy
              </Link>{" "}
              describes these standards in more detail.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">7. AI Disclosure</h2>
            <p className="mb-4">
              When listing a work, the artist states whether it was made
              entirely with AI tools, with AI assistance, or without AI. The
              artist is responsible for that disclosure being accurate.
            </p>
            <p>
              A listing that misstates how a work was made may be taken down,
              and repeated misstatements may lead to selling being disabled for
              the account.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              8. Intellectual Property
            </h2>
            <p className="mb-4">
              EduthArt and its software, branding, design, and site materials
              are protected by intellectual property laws.
            </p>
            <p>
              These Terms do not grant you ownership of our software, branding,
              or other proprietary materials except for the limited right to use
              the service under these Terms. Buying a work transfers the
              physical piece to you; it does not transfer the artist&apos;s
              copyright unless the artist says otherwise.
            </p>
            <p className="mt-4">
              If you believe an artwork listed on EduthArt infringes your
              copyright, you may submit a notice through our{" "}
              <Link href="/legal/dmca" className="text-primary hover:underline">
                DMCA policy and reporting page
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">9. Third-Party Services</h2>
            <p>
              EduthArt relies on third-party tools and infrastructure, including
              authentication, hosting, payment processing, shipping carriers,
              and email delivery. We are not responsible for third-party
              services or external sites that operate under their own terms and
              policies.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              10. Disclaimer of Warranties
            </h2>
            <p>
              The service is provided on an &quot;as is&quot; and &quot;as
              available&quot; basis without warranties of any kind, whether
              express or implied. We do not guarantee uninterrupted availability
              or error-free operation. Listings are written by the artists who
              sell through EduthArt, and we do not guarantee the accuracy of a
              listing or the future value of any work.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              11. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, EduthArt and its
              affiliates will not be liable for indirect, incidental, special,
              consequential, exemplary, or punitive damages, or for any loss of
              profits, revenues, data, goodwill, or business opportunities
              arising out of or related to your use of the service.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              12. Changes to the Service
            </h2>
            <p>
              We may modify, suspend, or discontinue parts of the service from
              time to time. We may also update these Terms, and when we do, we
              will post the updated version with a revised effective date.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">13. Contact</h2>
            <p>
              Questions about these Terms can be sent to{" "}
              <a
                href="mailto:support@eduthart.com"
                className="text-primary hover:underline"
              >
                support@eduthart.com
              </a>
              .
            </p>
          </section>

          <section className="border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              Adapted in part from the{" "}
              <a
                href="https://github.com/basecamp/policies"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Basecamp open-source policies
              </a>{" "}
              /{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                CC BY 4.0
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
