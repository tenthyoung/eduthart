import {
  Book,
  Brain,
  Clock3,
  Layers3,
  PenTool,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { MotionFade } from "../motion/motion-fade";
import { MotionStaggerFade } from "../motion/motion-stagger-fade";
import { Heading } from "../text/heading";
import { Button } from "../ui/button";

const services = [
  {
    title: "SMART REVIEW SCHEDULING",
    icon: Clock3,
  },
  {
    title: "AI STUDY MATERIAL SUPPORT",
    icon: Sparkles,
  },
  {
    title: "DECK CREATION WORKFLOWS",
    icon: Layers3,
  },
  {
    title: "FOCUSED DAILY PRACTICE",
    icon: Target,
  },
  {
    title: "FLASHCARD-BASED LEARNING",
    icon: Book,
  },
  {
    title: "RETENTION-FIRST DESIGN",
    icon: Brain,
  },
  {
    title: "COLLABORATIVE STUDY SYSTEMS",
    icon: Users,
  },
  {
    title: "NOTES INTO STUDY DECKS",
    icon: PenTool,
  },
];

export const SolutionsSection = () => {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Section Header */}
        <MotionStaggerFade className="text-center mb-16">
          <Heading variant="h2">
            MEMDOJO <span className="text-primary">FEATURES</span>
          </Heading>
        </MotionStaggerFade>

        {/* Services Grid */}
        <MotionStaggerFade className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <div
                key={index}
                className="bg-card p-8 rounded-2xl shadow-lg border hover:shadow-xl hover:border-primary transition-all duration-300"
              >
                <div className="space-y-4">
                  <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{service.title}</h3>
                </div>
              </div>
            );
          })}
        </MotionStaggerFade>

        {/* Additional Services Note */}
        <MotionFade className="flex justify-center mb-12">
          <div className="bg-card p-8 rounded-2xl shadow-lg border max-w-4xl w-full text-center">
            <p className="text-lg text-muted-foreground leading-relaxed">
              EduthArt is built around a simple goal: help people study more
              consistently and remember more of what they work hard to learn.
            </p>
          </div>
        </MotionFade>

        {/* CTA Button */}
        <MotionFade className="flex justify-center">
          <Button size="lg" asChild>
            <Link href="/services">VIEW ALL FEATURES</Link>
          </Button>
        </MotionFade>
      </div>
    </section>
  );
};
