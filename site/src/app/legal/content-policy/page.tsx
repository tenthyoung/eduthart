import Link from "next/link";

export default function ContentPolicy() {
  return (
    <div className="min-h-screen bg-background py-30 lg:py-40">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-4xl font-bold">Study Content Policy</h1>
        <p className="mb-8 text-muted-foreground">Last Updated: July 1, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="mb-4 text-2xl font-bold">1. Purpose</h2>
            <p>
              EduthArt is built for lawful, constructive learning. This policy
              explains the standards that apply to study content, public decks,
              folders, comments, ratings, and related community activity.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">2. What You May Share</h2>
            <p className="mb-4">You may create and publish content that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Is educational, study-oriented, or otherwise lawful to use.
              </li>
              <li>
                You created yourself, or have permission to upload and share.
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
                Uploading, sharing, or publishing content you do not have the
                right to use, including copyrighted materials where you lack
                permission.
              </li>
              <li>
                Sharing private, sensitive, or confidential information about
                yourself or others without authorization.
              </li>
              <li>
                Spam, scams, malware, or attempts to disrupt the platform.
              </li>
              <li>
                Public content whose main purpose is abuse, exploitation, or
                other unlawful activity rather than learning.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              4. Public Decks, Comments, and Ratings
            </h2>
            <p className="mb-4">
              If you publish a deck or folder, or leave a comment or rating, you
              are responsible for making sure the material is accurate enough
              for your intended use and appropriate for a public audience.
            </p>
            <p>
              Public study content may be reviewed by EduthArt when we receive
              moderation reports or detect potential policy issues.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">5. AI-Assisted Content</h2>
            <p>
              If you use EduthArt&apos;s AI features to create or revise study
              material, you remain responsible for reviewing the result before
              saving, sharing, or publishing it. AI-generated content may be
              incorrect, incomplete, or infringing if used carelessly.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">
              6. Moderation and Enforcement
            </h2>
            <p className="mb-4">
              We may review content and account activity to investigate reports,
              abuse, fraud, or safety concerns.
            </p>
            <p className="mb-4">Possible enforcement actions include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Warnings or requests to edit content.</li>
              <li>Hiding or removing public content.</li>
              <li>Disabling public publishing for an account.</li>
              <li>Suspending or terminating access to EduthArt.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">7. Reporting Concerns</h2>
            <p className="mb-4">
              If you believe public content violates this policy, contact{" "}
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
              For educator reports about test banks, exam answers, or other
              assessment misuse, use{" "}
              <Link
                href="/test-content-report"
                className="text-primary hover:underline"
              >
                the test content report form
              </Link>
              . For copyright complaints, use{" "}
              <Link href="/legal/dmca" className="text-primary hover:underline">
                the DMCA form
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
