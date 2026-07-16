export default function TrademarkNotice() {
  return (
    <div className="min-h-screen bg-background py-30 lg:py-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">Trademark Notice</h1>
        <p className="text-muted-foreground mb-8">Last Updated: July 1, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <p className="text-lg">
              &quot;EduthArt,&quot; the EduthArt logo, and related brand
              elements are used in connection with the EduthArt learning
              platform and related services.
            </p>
            <p className="mt-4">
              Unauthorized use of our branding, logos, or name in a way that
              suggests endorsement or ownership is prohibited.
            </p>
            <p className="mt-4">
              For brand-related questions, contact{" "}
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
