export default function AccessibilityStatement() {
  return (
    <div className="min-h-screen bg-background py-30 lg:py-40">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-4xl font-bold">Accessibility Statement</h1>
        <p className="mb-8 text-muted-foreground">Last Updated: July 1, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <p className="text-lg">
              EduthArt is actively working to make the website and app easier to
              use for a broader range of learners, devices, and assistive
              technologies.
            </p>
            <p>
              Accessibility is an ongoing product effort rather than a finished
              milestone. Some parts of the experience may still need
              improvement, and we welcome reports that help us prioritize the
              most important fixes.
            </p>
            <p>
              If you encounter an accessibility issue or need help using
              EduthArt, contact{" "}
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
