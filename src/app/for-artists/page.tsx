"use client";

import Link from "next/link";

import { MotionFade } from "@/components/motion/motion-fade";
import { MotionStaggerFade } from "@/components/motion/motion-stagger-fade";
import { Heading } from "@/components/text/heading";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const applicationSteps = [
  {
    title: "Read the artist FAQ",
    body: "We want applicants to understand how the program works, what we look for, and how representation on EduthArt is structured before applying.",
    cta: "Request the FAQ",
    href: "/contact",
  },
  {
    title: "Gather 10 digital images",
    body: "Prepare ten strong examples of your work, along with the year, dimensions, and medium for each piece.",
  },
  {
    title: "Prepare an artist statement",
    body: "A clear statement helps us understand your practice, point of view, and how you talk about the work with collectors.",
  },
  {
    title: "Plan to complete the form in one sitting",
    body: "The application is designed to be straightforward, but it works best when you have your materials ready before you begin.",
  },
  {
    title: "Have your payment details ready",
    body: "We use a small application fee to make sure submissions are serious and complete before review.",
  },
  {
    title: "Use the online application only",
    body: "Please do not email extra images or portfolio links as a substitute for the application process.",
  },
];

const acceptedBenefits = [
  "A guided onboarding experience with direct support from the EduthArt team.",
  "A straightforward platform for uploading artwork, details, and pricing.",
  "Exposure to a wider collector base with curatorial and presentation support.",
];

export default function ForArtistsPage() {
  return (
    <div className="min-h-screen bg-background pt-24 text-foreground">
      <section className="relative overflow-hidden border-b border-border/70 bg-[radial-gradient(circle_at_top_left,_rgba(216,195,165,0.34),_transparent_34%),linear-gradient(180deg,_#f9f4ed_0%,_#ffffff_100%)]">
        <div className="container mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <MotionStaggerFade className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-primary/80">
                Exhibit at EduthArt
              </p>
              <Heading variant="h1" className="max-w-3xl text-foreground">
                We represent emerging and mid-career artists with a distinctive point of view.
              </Heading>
              <p className="max-w-2xl text-lg text-muted-foreground">
                We are always looking for talented artists with strong work,
                professionalism, and a positive collaborative attitude. If that
                sounds like you, this is the place to start.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button asChild size="xl">
                  <Link href="#application">Start Your Application</Link>
                </Button>
                <Button asChild size="xl" variant="outline">
                  <Link href="/contact">Ask a Question</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] backdrop-blur-md sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
                We value your privacy
              </p>
              <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
                <p>
                  This website and its third-party tools may process personal
                  data. You can opt out of the sale or sharing of personal
                  information through our privacy controls and cookie policy.
                </p>
                <div className="rounded-2xl border border-border/70 bg-muted/45 p-4">
                  <p className="font-medium text-foreground">
                    Do Not Sell or Share My Personal Information
                  </p>
                  <p className="mt-2">
                    Cookie choices, privacy preferences, and accessibility help
                    should be easy to find before you apply.
                  </p>
                </div>
                <p>
                  Questions about accessibility or privacy can be directed
                  through our legal and support pages before you submit.
                </p>
              </div>
            </div>
          </MotionStaggerFade>
        </div>
      </section>

      <section id="application" className="container mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <MotionFade>
          <div className="mb-12 max-w-3xl">
            <Heading variant="h2" className="text-foreground">
              What should I do to apply?
            </Heading>
            <p className="text-lg text-muted-foreground">
              The application only takes a short amount of time, but it goes
              smoothly when everything is ready before you begin.
            </p>
          </div>
        </MotionFade>

        <MotionStaggerFade className="grid gap-5 lg:grid-cols-2">
          {applicationSteps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-[1.75rem] border border-border/70 bg-card p-6 shadow-[0_20px_50px_-40px_rgba(47,36,28,0.4)]"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </div>
              <h3 className="text-2xl text-foreground">{step.title}</h3>
              <p className="mt-3 text-muted-foreground">{step.body}</p>
              {step.cta && step.href ? (
                <Button asChild className="mt-5" size="sm" variant="outline">
                  <Link href={step.href}>{step.cta}</Link>
                </Button>
              ) : null}
            </div>
          ))}
        </MotionStaggerFade>
      </section>

      <section className="border-y border-border/70 bg-secondary/35">
        <div className="container mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8">
          <MotionFade>
            <div>
              <Heading variant="h2" className="text-foreground">
                Completing the online application is your first step.
              </Heading>
              <p className="text-lg text-muted-foreground">
                If accepted, we want the next phase to feel welcoming, practical,
                and genuinely useful for building a long-term relationship.
              </p>
              <ul className="mt-6 space-y-4 text-muted-foreground">
                {acceptedBenefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="rounded-2xl border border-border/60 bg-background/80 px-5 py-4"
                  >
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </MotionFade>

          <MotionFade delay={0.45}>
            <div className="rounded-[2rem] border border-primary/15 bg-white p-6 shadow-[0_30px_70px_-44px_rgba(47,36,28,0.38)] sm:p-8">
              <Heading variant="h3" className="mb-3 text-foreground">
                Start Your Application
              </Heading>
              <p className="mb-6 text-sm leading-6 text-muted-foreground">
                By checking the box below, you acknowledge that you have read
                and understood the application requirements above.
              </p>
              <div className="rounded-2xl border border-border/70 bg-muted/45 p-4">
                <div className="flex items-start gap-3">
                  <Checkbox checked id="artist-acknowledgement" />
                  <Label
                    className="block leading-6 font-normal"
                    htmlFor="artist-acknowledgement"
                  >
                    I understand the submission requirements and I am ready to
                    complete the artist application.
                  </Label>
                </div>
              </div>
              <div className="mt-6">
                <Button asChild className="w-full" size="lg">
                  <Link href="/contact">Apply</Link>
                </Button>
              </div>
            </div>
          </MotionFade>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <MotionStaggerFade className="grid gap-8 rounded-[2rem] border border-border/70 bg-gradient-to-r from-primary to-primary-light p-8 text-primary-foreground shadow-[0_30px_90px_-48px_rgba(47,36,28,0.45)] lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/80">
              You&apos;re Invited
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em]">
              Stay up to date with new art releases, artist stories, and opportunities.
            </h2>
            <p className="mt-4 max-w-2xl text-white/85">
              Join the list for weekly updates, artist resources, and curated
              collections. If you&apos;re an artist, you can also opt in for
              tips and future opportunities.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white" htmlFor="artist-email">
                  Email
                </Label>
                <Input
                  id="artist-email"
                  className="border-white/25 bg-white/10 text-white placeholder:text-white/60"
                  placeholder="Enter your email"
                  type="email"
                />
              </div>
              <div className="rounded-2xl border border-white/20 bg-black/10 p-4">
                <div className="flex items-center gap-3">
                  <Checkbox checked id="artist-opt-in" />
                  <Label
                    className="block leading-6 font-normal text-white"
                    htmlFor="artist-opt-in"
                  >
                    I&apos;m an artist. Send me tips and opportunities.
                  </Label>
                </div>
              </div>
              <Button className="w-full bg-white text-primary hover:bg-white/90" size="lg">
                Submit
              </Button>
            </div>
          </div>
        </MotionStaggerFade>
      </section>
    </div>
  );
}
