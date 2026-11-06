import Link from "next/link";

export default function ContentPolicy() {
  return (
    <div className="min-h-screen bg-background py-30 lg:py-40">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-4xl font-bold">Content Policy</h1>
        <p className="mb-8 text-muted-foreground">Last Updated: July 1, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="mb-4 text-2xl font-bold">1. Purpose</h2>
            <p>
              EduthArt is a marketplace where artists list original work and
              collectors buy it. This policy explains the standards that apply
              to artwork listings, artist profiles, shared collections, and
              related activity on the site.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              2. What You May List and Share
            </h2>
            <p className="mb-4">You may list and share work that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                You created yourself, or hold the rights to sell and show.
              </li>
              <li>
                Is described accurately, including its medium, dimensions,
                edition, condition, and whether it is signed.
              </li>
              <li>
                Does not violate the privacy, safety, or rights of others.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">3. What Is Not Allowed</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Harassment, threats, hate, or abusive conduct.</li>
              <li>Impersonation, deception, or fraudulent activity.</li>
              <li>
                Listing work you do not have the right to sell, including copies
                of another artist&apos;s work or images you lack permission to
                use.
              </li>
              <li>
                Passing off a reproduction as an original, misstating an edition
                size, or making authenticity claims you cannot stand behind.
              </li>
              <li>
                Sharing private, sensitive, or confidential information about
                yourself or others without authorization.
              </li>
              <li>
                Spam, scams, malware, or attempts to disrupt the platform.
              </li>
              <li>
                Listings or profiles whose main purpose is abuse, exploitation,
                or other unlawful activity rather than selling art.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              4. Listings, Profiles, and Shared Collections
            </h2>
            <p className="mb-4">
              If you publish a listing or an artist profile, or share a
              collection by link, you are responsible for making sure the
              material is accurate and appropriate for a public audience. A
              collector relies on your listing to decide what they are buying.
            </p>
            <p>
              Public listings and profiles may be reviewed by EduthArt when we
              receive a report or detect a potential policy issue.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">5. AI Disclosure</h2>
            <p>
              When you list a work, EduthArt asks whether it was made entirely
              with AI tools, with AI assistance, or without AI. That disclosure
              must be truthful. Listing AI-generated imagery as hand-made work,
              or leaving the disclosure blank to avoid the question, is treated
              as a misleading listing under this policy.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              6. Moderation and Enforcement
            </h2>
            <p className="mb-4">
              We may review listings, profiles, and account activity to
              investigate reports, abuse, fraud, or safety concerns.
            </p>
            <p className="mb-4">Possible enforcement actions include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Warnings or requests to correct a listing.</li>
              <li>Taking a listing down or removing it.</li>
              <li>Disabling selling for an account.</li>
              <li>Suspending or terminating access to EduthArt.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">7. Reporting Concerns</h2>
            <p className="mb-4">
              If you believe a listing or profile violates this policy, contact{" "}
              <a
                href="mailto:support@eduthart.com"
                className="text-primary hover:underline"
              >
                support@eduthart.com
              </a>{" "}
              or use any in-product reporting flow that EduthArt makes
              available.
            </p>
            <p>
              If an artwork listed on EduthArt infringes a copyright you own or
              represent, use{" "}
              <Link href="/legal/dmca" className="text-primary hover:underline">
                the DMCA form
              </Link>{" "}
              so the notice reaches the right people with the details the law
              requires.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
