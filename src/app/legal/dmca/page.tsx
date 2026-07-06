import { DmcaReportForm } from "@/components/form/dmca-report-form";
import { SUPPORT_EMAIL } from "@/constants/contact.constants";

export default async function DmcaPolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ deckUrl?: string }>;
}) {
  const { deckUrl } = await searchParams;

  return (
    <div className="min-h-screen bg-background py-30 lg:py-40">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-4xl font-bold">
          Copyright Infringement and DMCA Policy
        </h1>
        <p className="mb-6 text-muted-foreground">Last Updated: July 1, 2026</p>

        <div className="prose prose-invert mb-10 max-w-none space-y-5">
          <p>
            EduthArt is committed to respecting the intellectual property rights
            of others. If you believe that content in a public EduthArt deck
            infringes your copyright, you may submit a DMCA notice using the
            form below.
          </p>
          <p>
            The fastest way to notify us is through this page. You may also
            email your notice to{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-primary hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <p>
            Complete complaints should include valid contact information, a
            description of the copyrighted work, the specific URLs of the
            allegedly infringing content, the required good-faith and accuracy
            statements, and your physical or electronic signature.
          </p>
          <p>
            EduthArt may share your notice with the affected publisher when
            appropriate and may terminate repeat infringers in accordance with
            applicable law.
          </p>
        </div>

        <div className="rounded-[2rem] border border-border/60 bg-card/90 p-6 shadow-sm sm:p-8">
          <DmcaReportForm initialDeckUrl={deckUrl} />
        </div>
      </div>
    </div>
  );
}
