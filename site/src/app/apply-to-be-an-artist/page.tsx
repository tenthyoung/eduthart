"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { MotionFade } from "@/components/motion/motion-fade";
import { Disclosure } from "@/components/ui/disclosure";
import { Heading } from "@/components/text/heading";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const artistApplicationSteps = [
  {
    title: "Preparation",
    summary:
      "Review the requirements and gather everything you need before you begin.",
  },
  {
    title: "Artist Profile",
    summary: "Share your name, location, website, and background.",
  },
  {
    title: "Artwork Submission",
    summary: "Upload 10 artworks with dimensions, medium, and year created.",
  },
  {
    title: "Statement and Review",
    summary: "Add your artist statement and confirm your submission details.",
  },
  {
    title: "Payment and Submit",
    summary: "Complete the application fee and send everything for review.",
  },
] as const;

const preparationChecklist = [
  "10 digital images of your artwork",
  "The year, dimensions, and medium for each work",
  "Your artist statement",
  "Your website, Instagram, or portfolio link",
  "A payment method for the application fee",
] as const;

const applicationFields = [
  { id: "artist-name", label: "Full name", placeholder: "Your full name" },
  { id: "artist-email", label: "Email", placeholder: "you@example.com" },
  {
    id: "artist-location",
    label: "Location",
    placeholder: "City, State / Country",
  },
  {
    id: "artist-website",
    label: "Portfolio or website",
    placeholder: "https://yourportfolio.com",
  },
] as const;

export default function ApplyToBeAnArtistPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const progressRef = useRef<HTMLElement>(null);

  const currentStep = artistApplicationSteps[stepIndex];
  const progressPercentage = Math.round(
    ((stepIndex + 1) / artistApplicationSteps.length) * 100
  );

  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const hasChangedStep = useRef(false);

  // After Next or Back the button that was pressed is hidden with its panel,
  // so move focus to the step heading instead of letting it drop to <body>.
  // This also announces the new step. Skip the first render.
  useEffect(() => {
    if (!hasChangedStep.current) return;
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [stepIndex]);

  const goToStep = (index: number) => {
    hasChangedStep.current = true;
    setStepIndex(index);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    progressRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <div className="min-h-screen bg-background pt-24 text-foreground">
      <section className="border-b border-border/70 bg-white dark:bg-background">
        <div className="container mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
          <MotionFade>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-primary/80">
                  Artist Application
                </p>
                <Heading variant="h1" className="max-w-3xl text-foreground">
                  Apply to be an EduthArt artist
                </Heading>
                <p className="text-lg text-muted-foreground">
                  This page is your application workspace. Start by confirming
                  you have everything prepared, then move through each step in
                  order.
                </p>
              </div>

              <Button asChild size="lg" variant="outline">
                <Link href="/for-artists">Back to Requirements</Link>
              </Button>
            </div>
          </MotionFade>
        </div>
      </section>

      <section
        ref={progressRef}
        className="container mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 lg:px-8"
      >
        <MotionFade>
          <div className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-[0_24px_70px_-46px_rgba(47,36,28,0.4)] sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
                  Progress
                </p>
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="mt-2 text-2xl text-foreground outline-none"
                >
                  Step {stepIndex + 1} of {artistApplicationSteps.length}:{" "}
                  {currentStep.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {currentStep.summary}
                </p>
              </div>
              <div className="min-w-[8rem] text-left lg:text-right">
                <p className="text-3xl font-semibold text-primary">
                  {progressPercentage}%
                </p>
                <p className="text-sm text-muted-foreground">Complete</p>
              </div>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-muted">
              <div
                aria-hidden="true"
                className="h-full rounded-full bg-primary-light transition-[width] duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <Disclosure
              summary="Show all steps"
              openSummary="Hide steps"
              className="mt-5 border-t border-border/70 pt-1"
              summaryClassName="w-fit"
              contentClassName="pt-1 pb-0"
            >
              <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {artistApplicationSteps.map((step, index) => {
                  const isCurrent = index === stepIndex;

                  return (
                    <li
                      key={step.title}
                      aria-current={isCurrent ? "step" : undefined}
                      className={[
                        "flex items-start gap-3 rounded-xl border px-4 py-3",
                        isCurrent
                          ? "border-primary/30 bg-primary/8"
                          : "border-border/70 bg-card",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          isCurrent
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {index + 1}
                      </span>
                      <span>
                        <span className="block text-sm font-medium leading-6 text-foreground">
                          {step.title}
                        </span>
                        <span className="block text-xs leading-5 text-muted-foreground">
                          {step.summary}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Disclosure>
          </div>
        </MotionFade>
      </section>

      <section className="container mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <MotionFade delay={0.1}>
          <div className="rounded-[2rem] border border-primary/15 bg-white dark:bg-card p-6 shadow-[0_30px_70px_-44px_rgba(47,36,28,0.38)] sm:p-8 lg:p-10">
            {/* Panels stay mounted and are hidden instead, so anything typed
                survives going Back and Next. */}
            <div hidden={stepIndex !== 0}>
              <Heading variant="h2" className="mb-3 text-foreground">
                Have these ready before you begin
              </Heading>
              <p className="text-sm leading-6 text-muted-foreground">
                The application works best when you can finish it in one
                sitting. These are the items you should have prepared before
                moving to the next step.
              </p>

              <div className="mt-6 rounded-[1.5rem] border border-border/70 bg-muted/35 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  {preparationChecklist.map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <Checkbox checked id={item} />
                      <Label
                        className="block font-normal leading-6"
                        htmlFor={item}
                      >
                        {item}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex sm:justify-end">
                <Button
                  className="w-full sm:w-auto sm:min-w-40"
                  size="lg"
                  onClick={() => goToStep(1)}
                >
                  Next
                </Button>
              </div>
            </div>

            <div hidden={stepIndex !== 1}>
              <Heading variant="h2" className="mb-3 text-foreground">
                Artist profile
              </Heading>
              <p className="text-sm leading-6 text-muted-foreground">
                Tell us who you are and where we can see more of your work.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {applicationFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>{field.label}</Label>
                    <Input
                      id={field.id}
                      placeholder={field.placeholder}
                      type={field.id === "artist-email" ? "email" : "text"}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-8 flex">
                <Button
                  className="w-full sm:w-auto sm:min-w-40"
                  size="lg"
                  variant="outline"
                  onClick={() => goToStep(0)}
                >
                  Back
                </Button>
              </div>
            </div>
          </div>
        </MotionFade>
      </section>
    </div>
  );
}
