import { TestContentReportForm } from "@/components/form/test-content-report-form";

export default async function TestContentReportPage({
  searchParams,
}: {
  searchParams: Promise<{ deckUrl?: string }>;
}) {
  const { deckUrl } = await searchParams;

  return (
    <div className="min-h-screen bg-background py-30 lg:py-40">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-4xl font-bold">Report Test Content</h1>
        <p className="mb-6 text-muted-foreground">Last Updated: July 1, 2026</p>

        <div className="prose prose-invert mb-10 max-w-none space-y-5">
          <p>
            EduthArt is built to help people learn honestly. If you are an
            educator and you find answers to tests, quizzes, exams, or other
            assessment content in a public EduthArt deck, use this form to tell
            us exactly where it appears.
          </p>
          <p>
            Please submit direct links to the specific public deck pages that
            contain the material. If you believe the issue is copyright
            infringement rather than academic-integrity misuse, use our DMCA
            form instead.
          </p>
        </div>

        <div className="rounded-[2rem] border border-border/60 bg-card/90 p-6 shadow-sm sm:p-8">
          <TestContentReportForm initialDeckUrl={deckUrl} />
        </div>
      </div>
    </div>
  );
}
