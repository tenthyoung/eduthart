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
              applications, study tools, content publishing features, AI-powered
              workflows, and related services.
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
              EduthArt is a learning platform designed to help users create,
              organize, study, publish, and review educational material using
              spaced repetition, syncing, and AI-assisted study tools.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              4. Subscriptions, Billing, and Refunds
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Certain features require a paid subscription.</li>
              <li>
                Pricing, plan features, and usage limits may change over time
                with reasonable notice.
              </li>
              <li>
                Subscriptions purchased through Apple or Google are billed and
                renewed by those platforms under their own billing rules.
              </li>
              <li>
                You can manage or cancel store-based subscriptions through the
                applicable app store account settings.
              </li>
              <li>
                EduthArt may offer an in-app refund request flow, but final
                billing outcomes can still depend on the payment provider or app
                store.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              5. User Content and Public Publishing
            </h2>
            <p className="mb-4">
              You retain ownership of the study content you create, subject to
              the rights needed for us to host, process, store, display, sync,
              and moderate that content as part of the service.
            </p>
            <p className="mb-4">
              If you publish a deck, folder, comment, or rating publicly, you
              understand that other users may be able to view that content and
              associated public profile details.
            </p>
            <p>
              You are responsible for making sure that any content you upload,
              generate, or publish does not violate the law, the rights of
              others, or these Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              6. Acceptable Use and Moderation
            </h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the service unlawfully or in a way that harms others.</li>
              <li>Upload content you do not have permission to use.</li>
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
              We may investigate reports, remove or restrict content, disable
              publishing, suspend accounts, or terminate access when we believe
              it is necessary to protect users, enforce these Terms, or comply
              with the law.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">7. AI Features</h2>
            <p className="mb-4">
              EduthArt may offer AI-assisted tools for creating, revising, or
              studying content. AI output can be inaccurate, incomplete,
              misleading, or unsuitable for your intended use.
            </p>
            <p>
              You are responsible for reviewing AI-generated or AI-assisted
              output before relying on it, sharing it, or publishing it
              publicly.
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
              the service under these Terms.
            </p>
            <p className="mt-4">
              If you believe public EduthArt content infringes your copyright,
              you may submit a notice through our{" "}
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
              authentication, hosting, AI, billing, and app-store platforms. We
              are not responsible for third-party services or external sites
              that operate under their own terms and policies.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              10. Disclaimer of Warranties
            </h2>
            <p>
              The service is provided on an &quot;as is&quot; and &quot;as
              available&quot; basis without warranties of any kind, whether
              express or implied. We do not guarantee uninterrupted
              availability, error-free operation, or any specific academic,
              professional, or personal learning outcome.
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
