import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Frame, LayoutGrid, Ruler, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";

const collections = [
  {
    eyebrow: "Under $1,000",
    title: "Affordable originals",
    copy: "A strong entry point for first-time collectors who want real work, not mass-produced decor.",
  },
  {
    eyebrow: "Living room",
    title: "Art that anchors a room",
    copy: "Larger works and bold palettes designed to create a focal point without overwhelming the space.",
  },
  {
    eyebrow: "Warm neutrals",
    title: "Collected calm",
    copy: "The softer, tan-led collection language that fits the direction you described for the brand.",
  },
];

const discoveryWays = [
  "Browse by medium, mood, room, or price point",
  "Use curated collections instead of a generic inventory wall",
  "Mix approachable copy with serious collector cues",
  "Offer advisory help before a buyer feels stuck",
];

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
    <div className="bg-white">
      <section id="collections" className="border-y border-border/40 bg-white py-18 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary/70">
              Curated collections
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
              The homepage should guide people into buying paths.
            </h2>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Saatchi Art and UGallery both make the first click easy: category discovery,
              collection-led browsing, and language that answers “what should I look at first?”
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {collections.map((collection) => (
              <article
                key={collection.title}
                className="rounded-[1.75rem] border border-border/70 bg-white p-6 shadow-[0_20px_40px_-34px_rgba(65,45,30,0.12)]"
              >
                <div className="mb-6 h-44 rounded-[1.25rem] bg-[linear-gradient(160deg,#fafafa_0%,#d4d4d8_52%,#3f3f46_100%)]" />
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/70">
                  {collection.eyebrow}
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-foreground">
                  {collection.title}
                </h3>
                <p className="mt-3 text-muted-foreground">{collection.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="browse" className="py-18 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="rounded-[2rem] border border-border/60 bg-white p-8 shadow-[0_24px_60px_-42px_rgba(60,44,28,0.22)] lg:p-10">
            <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-[0.18em] text-primary/70">
              <LayoutGrid className="h-4 w-4" />
              Discovery model
            </div>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
              What we need to mock into the IA
            </h2>
            <div className="mt-8 grid gap-4">
              {discoveryWays.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/60 p-4"
                >
                  <Check className="mt-0.5 h-5 w-5 text-primary" />
                  <p className="text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/60 bg-white p-8 shadow-[0_24px_60px_-42px_rgba(60,44,28,0.12)] lg:p-10">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/70">
              Mocked buyer journey
            </p>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/80 bg-white p-5">
                <p className="text-sm uppercase tracking-[0.16em] text-primary/70">
                  01
                </p>
                <h3 className="mt-2 text-2xl font-semibold">Land on a clear value proposition</h3>
                <p className="mt-2 text-muted-foreground">
                  Original art, curated inventory, and support for new collectors.
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white p-5">
                <p className="text-sm uppercase tracking-[0.16em] text-primary/70">
                  02
                </p>
                <h3 className="mt-2 text-2xl font-semibold">Choose a browse path</h3>
                <p className="mt-2 text-muted-foreground">
                  Medium, room, style, or budget should all feel like valid starting points.
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white p-5">
                <p className="text-sm uppercase tracking-[0.16em] text-primary/70">
                  03
                </p>
                <h3 className="mt-2 text-2xl font-semibold">Get reassurance before purchase</h3>
                <p className="mt-2 text-muted-foreground">
                  Shipping, returns, authenticity, and human help need visible placement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="advisory" className="border-y border-border/40 bg-white py-18 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary/70">
              Advisory layer
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
              Keep it ecommerce-friendly, but never generic.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              This is where EduthArt can feel more elevated than a normal decor site:
              thoughtful curation, warmer editorial copy, and a visible “we can help you choose” path.
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

          <div className="rounded-[2rem] border border-border/60 bg-white p-8 shadow-[0_24px_50px_-40px_rgba(60,44,28,0.14)] lg:p-10">
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
                  className="rounded-[1.75rem] border border-border/70 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(56,40,25,0.24)]"
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
