"use client";

import {
  Brain,
  CheckCircle,
  Clock,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import { MotionStaggerFade } from "../motion/motion-stagger-fade";
import { Heading } from "../text/heading";

const features = [
  {
    icon: Brain,
    title: "Curated Exhibitions",
    description:
      "Thoughtfully assembled shows bring contemporary painting, sculpture, and mixed media into a clear curatorial conversation.",
    gradient: "from-[#7f6147] to-[#b99b78]",
  },
  {
    icon: MessageSquare,
    title: "Private Viewings",
    description:
      "Schedule a quieter appointment for collectors, designers, and advisors who want time with the work beyond opening night.",
    gradient: "from-[#8d6e52] to-[#c7ad8b]",
  },
  {
    icon: CheckCircle,
    title: "Collection Advisory",
    description:
      "We help place works with confidence, offering practical guidance around scale, finish, provenance, and long-term fit.",
    gradient: "from-[#6f533b] to-[#a98963]",
  },
  {
    icon: Clock,
    title: "Rotating Installations",
    description:
      "The gallery evolves throughout the year with focused presentations, seasonal rehangs, and new artist introductions.",
    gradient: "from-[#9a7858] to-[#d2b48c]",
  },
  {
    icon: Smartphone,
    title: "Online Viewing Room",
    description:
      "Browse selected works remotely before you visit, then continue the conversation with the gallery when something resonates.",
    gradient: "from-[#86684a] to-[#c8a67f]",
  },
];

export const HowItWorksSection = () => {
  return (
    <section id="features" className="flex w-full items-center justify-center">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <MotionStaggerFade>
          {/* Section Header */}
          <div className="text-center mb-16">
            <Heading variant="h2" className="mb-4">
              <span className="text-primary">Exhibitions</span>
            </Heading>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A gallery program shaped around strong curation, calm viewing,
              and meaningful conversations around the work.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative bg-card border border-border/50 rounded-2xl p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                >
                  {/* Icon with gradient background */}
                  <div
                    className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.gradient} mb-6`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Decorative gradient border on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
                </div>
              );
            })}
          </div>

          {/* Bottom CTA or additional info */}
          <div className="text-center mt-16">
            <p className="text-lg text-muted-foreground">
              Discover why collectors, designers, and first-time visitors
              return to <span className="text-primary font-semibold">EduthArt</span>
            </p>
          </div>
        </MotionStaggerFade>
      </div>
    </section>
  );
};
