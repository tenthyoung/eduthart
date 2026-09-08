import { Frame, Ruler, ShieldCheck } from "lucide-react";

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
    <div className="bg-white dark:bg-background">
      <section className="border-t border-border/40 py-18 lg:py-24">
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
