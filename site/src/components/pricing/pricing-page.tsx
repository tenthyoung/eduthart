"use client";

import { Heading } from "@/components/text/heading";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillingPeriod, pricingPlans } from "@/lib/pricing";
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  return (
    <div className="min-h-screen bg-background pt-24 text-foreground">
      <section className="relative overflow-hidden bg-white">
        <div className="relative container mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="size-4" />
              Membership tiers for visitors and collectors
            </div>
            <Heading variant="h1" className="text-center text-foreground">
              Membership shaped for every{" "}
              <span className="text-primary">kind of visitor</span>
            </Heading>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Whether you are discovering the gallery for the first time or
              collecting regularly, each tier offers a clearer way into the
              EduthArt program.
            </p>
          </div>

          <div className="mt-10 flex justify-center">
            <Tabs
              value={billingPeriod}
              onValueChange={(value) =>
                setBillingPeriod(value as BillingPeriod)
              }
            >
              <TabsList className="h-auto p-1">
                <TabsTrigger value="monthly" className="min-w-28 px-5 py-2.5">
                  Monthly
                </TabsTrigger>
                <TabsTrigger value="annual" className="min-w-28 px-5 py-2.5">
                  Annual
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => {
              const isHighlighted = plan.id === "plus";
              const price = plan.prices[billingPeriod];
              const billingLabel = plan.billingLabels[billingPeriod];

              return (
                <article
                  key={plan.id}
                  className={[
                    "relative flex h-full flex-col rounded-[2rem] border bg-card/95 p-8 shadow-sm backdrop-blur-sm transition-transform duration-300",
                    isHighlighted
                      ? "border-primary/40 shadow-2xl shadow-primary/12 lg:-translate-y-3"
                      : "border-border/60",
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold text-muted-foreground">
                      {plan.eyebrow}
                    </span>
                    {plan.highlightTag ? (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                        {plan.highlightTag}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    <h2 className="text-3xl font-semibold tracking-tight">
                      {plan.name}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mt-8 flex items-end gap-3">
                    <div className="text-4xl font-semibold tracking-tight text-primary">
                      {price}
                    </div>
                    {billingLabel ? (
                      <div className="pb-1 text-sm text-muted-foreground">
                        {billingLabel}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {plan.highlightPills.map((pill) => (
                      <span
                        key={pill}
                        className="rounded-full border border-border/70 bg-background/80 px-3 py-2 text-sm font-medium text-foreground/80"
                      >
                        {pill}
                      </span>
                    ))}
                  </div>

                  <div className="mt-8 space-y-4">
                    {plan.features.map((feature) => (
                      <div
                        key={feature.title}
                        className="rounded-2xl border border-border/60 bg-background/70 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 text-primary">
                            <Check className="size-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{feature.title}</h3>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8">
                    <Button
                      asChild
                      variant={isHighlighted ? "gradient" : "outline"}
                      size="lg"
                      className="w-full"
                    >
                      <Link href="/contact">{plan.ctaLabel}</Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-12 rounded-[2rem] border border-primary/15 bg-primary/6 p-8 text-center">
            <h3 className="text-2xl font-semibold tracking-tight">
              Need help choosing?
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Start with Visitor access, move into Patron or Collector
              membership when you want earlier access, closer guidance, and a
              more tailored gallery relationship.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-4 sm:flex-row">
              <Button asChild variant="gradient" size="lg">
                <Link href="/#visit">Plan Your Visit</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/contact">Talk to us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
