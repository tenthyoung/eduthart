"use client";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/text/heading";
import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";

export function DownloadSection() {
  return (
    <section
      id="visit"
      className="flex h-full w-full items-center justify-center scroll-mt-36 lg:scroll-mt-[22vh]"
    >
      <div className="container mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-gradient-to-br from-background via-background to-primary/5 px-6 py-12 shadow-[0_24px_80px_-40px_rgba(82,56,192,0.45)] sm:px-10 lg:px-14 lg:py-16">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <CalendarDays className="h-4 w-4" />
                Visit EduthArt
              </div>
              <Heading variant="h2" className="mb-4 text-foreground">
                Plan a gallery visit that feels personal.
              </Heading>
              <p className="text-base leading-7 text-muted-foreground sm:text-lg">
                Schedule a private viewing, ask about available works, or
                explore membership options designed for regular visitors and
                serious collectors.
              </p>
            </div>

            <div className="flex flex-col items-start gap-4">
              <Button asChild variant="gradient" size="xl">
                <Link href="/contact">
                  <CalendarDays className="h-5 w-5" />
                  Request a Private Viewing
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="xl"
                className="border-primary/20 bg-background/90 hover:bg-primary/5"
              >
                <Link href="/pricing">
                  <MapPin className="h-5 w-5" />
                  Explore Membership
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
