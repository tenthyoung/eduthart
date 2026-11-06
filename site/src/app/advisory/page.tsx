import type { Metadata } from "next";

import { AdvisoryRequestForm } from "@/components/advisory/advisory-request-form";

// No `openGraph` here on purpose: the root layout's object, and the root
// opengraph-image with it, carry through to this page.
export const metadata: Metadata = {
  description:
    "Tell a curator your budget, room and taste, and get a free shortlist of original works chosen for you.",
  title: "Help me choose: free art advisory | EduthArt",
};

const steps = [
  {
    body: "Budget, room, size, the look you like. A sentence or two is plenty.",
    title: "Tell us what you're after",
  },
  {
    body: "A curator reads your brief, and anything you've saved on EduthArt.",
    title: "A curator looks for you",
  },
  {
    body: "You get a private link to a short list of works, ready to share.",
    title: "Get a shortlist",
  },
];

export default function AdvisoryPage() {
  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-32 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <header className="space-y-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Free art advisory
            </p>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-5xl">
              Help me choose
            </h1>
            <p className="text-lg text-muted-foreground">
              Not sure where to start? Tell one of our curators about the space
              and what you like, and they will put together a shortlist of
              original works for you. There is no charge and no obligation to
              buy.
            </p>
          </div>

          <ol className="space-y-6 border-t border-border pt-8">
            {steps.map((step, index) => (
              <li className="flex gap-4" key={step.title}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-sm font-semibold">
                  {index + 1}
                </span>
                <div>
                  <h2 className="font-semibold">{step.title}</h2>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </header>

        <section aria-label="Your brief">
          <AdvisoryRequestForm />
        </section>
      </div>
    </main>
  );
}
