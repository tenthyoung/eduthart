"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { MotionStaggerFade } from "../motion/motion-stagger-fade";
import { SectionContainer } from "../section-container";
import { Heading } from "../text/heading";
import { Button } from "../ui/button";

export const WhoWeAreSection = () => {
  return (
    <SectionContainer>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Content Grid */}
        <div className="mb-16 grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Image */}
          <div className="relative order-2 lg:order-1">
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-[#faf8f3] via-[#e8e2d9] to-[#aaa39a] p-12 shadow-2xl shadow-primary/10 dark:from-[#292827] dark:via-[#33312e] dark:to-[#3c3935]">
              <div className="flex items-center justify-center">
                <BrandMark className="h-48 w-auto" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-primary/18 to-transparent" />
            </div>
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2 space-y-8">
            <div className="space-y-6">
              <MotionStaggerFade>
                <Heading variant="h2">
                  About <span className="text-primary">EduthArt</span>
                </Heading>

                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  EduthArt is a contemporary gallery devoted to refined
                  presentation, thoughtful curation, and long-term relationships
                  with artists and collectors.
                </p>

                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Founded in Orange County, California, the gallery brings
                  together emerging and established voices across painting,
                  sculpture, and mixed media in a setting designed to feel calm,
                  intentional, and quietly memorable.
                </p>

                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Whether you are beginning a collection, sourcing for an
                  interior, or simply making time to look closely, EduthArt
                  offers a welcoming place to encounter serious work with clear
                  guidance and no pressure.
                </p>

                <Button variant="gradient" size="lg" asChild>
                  <Link href="/services">
                    Explore exhibitions <ChevronRight />
                  </Link>
                </Button>
              </MotionStaggerFade>
            </div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
};
