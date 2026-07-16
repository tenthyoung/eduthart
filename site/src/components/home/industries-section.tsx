import MuxPlayer from "@mux/mux-player-react";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { MotionStaggerFade } from "../motion/motion-stagger-fade";
import { SectionContainer } from "../section-container";
import { Heading } from "../text/heading";
import { Button } from "../ui/button";

export const IndustriesSection = () => {
  const industries = [
    "Students",
    "Certification Prep",
    "Study Groups",
    "Internal Training",
  ];

  return (
    <SectionContainer>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="space-y-8">
            <MotionStaggerFade className="space-y-6">
              {/* Industries we serve */}
              <Heading variant="h2">
                Who <span className="text-primary">EduthArt Helps</span>
              </Heading>
              <p className="text-lg text-muted-foreground leading-relaxed">
                EduthArt supports learners across different contexts, from solo
                study sessions to structured team training. The product is built
                for people who need stronger recall, better routines, and less
                friction getting started.
              </p>
              {/* Industries List */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold mb-6">Common Fits:</h3>
                <ul className="space-y-3">
                  {industries.map((industry, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-lg">{industry}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Button */}
              <div className="pt-4">
                <Button size="lg" asChild>
                  <Link href="/industries">Explore Use Cases</Link>
                </Button>
              </div>
            </MotionStaggerFade>
          </div>

          {/* Circular Video */}
          <div className="relative order-1 lg:order-2 flex justify-center">
            <div className="relative w-80 h-80 lg:w-96 lg:h-96">
              {/* Circular Video Container */}
              <div className="w-full h-full rounded-full overflow-hidden shadow-2xl">
                <MuxPlayer
                  playbackId="v2WOpoboHdIF01xiYkrlydclipNLw2TQUgj1f89N1PRM"
                  autoPlay
                  muted
                  loop
                  nohotkeys
                  style={
                    {
                      "--media-object-fit": "cover",
                      "--media-object-position": "center",
                      height: "100%",
                      "--controls": "none",
                    } as React.CSSProperties
                  }
                />
              </div>

              {/* Optional decorative ring */}
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
};
