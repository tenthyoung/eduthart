"use client";

import Link from "next/link";

import { MotionFade } from "@/components/motion/motion-fade";
import { MotionStaggerFade } from "@/components/motion/motion-stagger-fade";
import { Heading } from "@/components/text/heading";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const artistApplicationSteps = [
  {
    title: "Preparation",
    summary: "Review the requirements and gather everything you need before you begin.",
    status: "current",
  },
  {
    title: "Artist Profile",
    summary: "Share your name, location, website, and background.",
    status: "upcoming",
  },
  {
    title: "Artwork Submission",
    summary: "Upload 10 artworks with dimensions, medium, and year created.",
    status: "upcoming",
  },
  {
    title: "Statement and Review",
    summary: "Add your artist statement and confirm your submission details.",
    status: "upcoming",
  },
  {
    title: "Payment and Submit",
    summary: "Complete the application fee and send everything for review.",
    status: "upcoming",
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
  { id: "artist-location", label: "Location", placeholder: "City, State / Country" },
  { id: "artist-website", label: "Portfolio or website", placeholder: "https://yourportfolio.com" },
] as const;

const progressPercentage = 20;

export default function ApplyToBeAnArtistPage() {
  return (
    <div className="min-h-screen bg-background pt-24 text-foreground">
      <section className="border-b border-border/70 bg-[radial-gradient(circle_at_top_left,_rgba(216,195,165,0.28),_transparent_34%),linear-gradient(180deg,_#faf5ee_0%,_#ffffff_100%)]">
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
                  you have everything prepared, then move through each step in order.
                </p>
              </div>

              <Button asChild size="lg" variant="outline">
                <Link href="/for-artists">Back to Requirements</Link>
              </Button>
            </div>
          </MotionFade>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <MotionFade>
          <div className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-[0_24px_70px_-46px_rgba(47,36,28,0.4)] sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
                  Progress
                </p>
                <h2 className="mt-2 text-2xl text-foreground">
                  Step 1 of {artistApplicationSteps.length}: Preparation
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Confirm your materials before you start entering application details.
                </p>
              </div>
              <div className="min-w-[8rem] text-left lg:text-right">
                <p className="text-3xl font-semibold text-primary">{progressPercentage}%</p>
                <p className="text-sm text-muted-foreground">Complete</p>
              </div>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-muted">
              <div
                aria-hidden="true"
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </MotionFade>
      </section>

      <section className="container mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <MotionStaggerFade className="space-y-4">
            {artistApplicationSteps.map((step, index) => {
              const isCurrent = step.status === "current";

              return (
                <div
                  key={step.title}
                  className={[
                    "rounded-[1.5rem] border p-5 transition-colors",
                    isCurrent
                      ? "border-primary/30 bg-primary/8 shadow-[0_20px_50px_-40px_rgba(47,36,28,0.45)]"
                      : "border-border/70 bg-card",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={[
                        "inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
                        isCurrent
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      ].join(" ")}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-xl text-foreground">{step.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {step.summary}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </MotionStaggerFade>

          <MotionFade delay={0.4}>
            <div className="rounded-[2rem] border border-primary/15 bg-white p-6 shadow-[0_30px_70px_-44px_rgba(47,36,28,0.38)] sm:p-8">
              <Heading variant="h2" className="mb-3 text-foreground">
                Have these ready before you begin
              </Heading>
              <p className="text-sm leading-6 text-muted-foreground">
                The application works best when you can finish it in one sitting.
                These are the items you should have prepared before moving to the next step.
              </p>

              <div className="mt-6 rounded-[1.5rem] border border-border/70 bg-muted/35 p-5">
                <div className="space-y-4">
                  {preparationChecklist.map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <Checkbox checked id={item} />
                      <Label className="block font-normal leading-6" htmlFor={item}>
                        {item}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-xl text-foreground">Application preview</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Next, the artist will fill out profile details before moving into artwork uploads and final review.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
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

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button className="flex-1" size="lg">
                  Continue to Artist Profile
                </Button>
                <Button asChild className="flex-1" size="lg" variant="outline">
                  <Link href="/for-artists">Review Requirements Again</Link>
                </Button>
              </div>
            </div>
          </MotionFade>
        </div>
      </section>
    </div>
  );
}
