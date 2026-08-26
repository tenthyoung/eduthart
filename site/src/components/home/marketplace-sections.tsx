import { Button } from "@/components/ui/button";
import { ArrowRight, Frame, Ruler, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";

const advisoryPoints = [
  "Personal recommendations based on room, scale, and budget",
  "Guidance for first-time buyers who want confidence",
  "Clear return, shipping, and framing information",
];

const assurancePoints = [
  {
    icon: ShieldCheck,
    title: "Buy with confidence",
    copy: "Trust messaging should be visible early, not buried: clear service, transparent policies, and responsive support.",
  },
  {
    icon: Ruler,
    title: "Scale for your space",
    copy: "Room-based merchandising helps buyers picture proportion, placement, and what size actually works.",
  },
  {
    icon: Frame,
    title: "Curated, not crowded",
    copy: "A marketplace can still feel selective when collections are edited and the visual pace stays calm.",
  },
];

export function MarketplaceSections() {
  return (
    <div className="bg-background">
      <section
        id="advisory"
        className="border-y border-border/40 bg-background py-18 lg:py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary/70">
              Advisory layer
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
              Keep it ecommerce-friendly, but never generic.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              This is where EduthArt can feel more elevated than a normal decor
              site: thoughtful curation, warmer editorial copy, and a visible
              “we can help you choose” path.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild variant="gradient" size="lg">
                <Link href="/contact">
                  Start a consultation
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/about">See the brand story</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/60 bg-card p-8 shadow-[0_24px_50px_-40px_rgba(60,44,28,0.14)] lg:p-10">
            <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-primary/70">
              <Star className="h-4 w-4" />
              Suggested service language
            </div>
            <div className="mt-6 space-y-4">
              {advisoryPoints.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/60 bg-muted/60 px-5 py-4 text-muted-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-18 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-3">
            {assurancePoints.map((point) => {
              const Icon = point.icon;

              return (
                <article
                  key={point.title}
                  className="rounded-[1.75rem] border border-border/70 bg-card p-6 shadow-[0_18px_50px_-38px_rgba(56,40,25,0.24)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold text-foreground">
                    {point.title}
                  </h3>
                  <p className="mt-3 text-muted-foreground">{point.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
