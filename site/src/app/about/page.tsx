"use client";

import { MotionFade } from "@/components/motion/motion-fade";
import { MotionStaggerFade } from "@/components/motion/motion-stagger-fade";
import { Heading } from "@/components/text/heading";
import { Button } from "@/components/ui/button";
import TiltedCard from "@/components/ui/tilted-card";
import Link from "next/link";
import { STORY_SECTIONS, VALUES } from "./story/aboutStory.constants";
import { StorySection } from "./story/StorySection";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { useEffect, useState } from "react";
// import { OurTeamTabContent } from "./team/OurTeamTabContent";

export default function AboutPage() {
  // const [activeTab, setActiveTab] = useState("mission");
  // useEffect(() => {
  //   if (window.location.hash === "#team") {
  //     setActiveTab("team");
  //   }
  // }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pt-24">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <Heading variant="h1" className="text-center">
            <span className="text-primary">About</span> EduthArt
          </Heading>
        </div>

        <div className="mb-16 space-y-12">
          {/* Tabs UI and team content temporarily hidden */}
          {/* <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-16">
            <TabsList className="grid w-full grid-cols-2 mb-8 max-w-2xl mx-auto">
              <TabsTrigger value="mission" className="text-lg font-medium">
                Our Story
              </TabsTrigger>
              <TabsTrigger value="team" className="text-lg font-medium">
                Our Team
              </TabsTrigger>
            </TabsList>
            <TabsContent value="team">
              <OurTeamTabContent />
            </TabsContent>
          </Tabs> */}

          <div className="space-y-6">
            {STORY_SECTIONS.map((section, index) => (
              <MotionFade key={index}>
                <StorySection title={section.title} content={section.content} />
              </MotionFade>
            ))}
          </div>

          <MotionStaggerFade className="grid gap-8 md:grid-cols-2">
            {VALUES.map((value, index) => (
              <TiltedCard key={index}>
                <div className="rounded-lg border bg-card p-6">
                  <div>
                    <h3 className="mb-4 text-xl font-bold text-primary">
                      {value.title}
                    </h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </div>
                </div>
              </TiltedCard>
            ))}
          </MotionStaggerFade>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-primary/10 to-transparent p-8 rounded-lg border border-primary/20">
          <MotionStaggerFade>
            <h3 className="text-2xl font-bold mb-4">
              Ready to experience the gallery in person?
            </h3>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Explore exhibitions, request a private viewing, or learn more
              about membership and collecting through EduthArt.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/contact">Plan a Visit</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/services">View Exhibitions</Link>
              </Button>
            </div>
          </MotionStaggerFade>
        </div>
      </div>
    </div>
  );
}
