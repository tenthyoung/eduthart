"use client";

import { MotionFade } from "@/components/motion/motion-fade";
import { Heading } from "@/components/text/heading";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle,
  Clock,
  Layers3,
  Lightbulb,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function ServicesPage() {
  const services = [
    {
      icon: Brain,
      title: "Curated Exhibitions",
      description:
        "Explore tightly considered exhibitions that pair strong visual impact with clear curatorial intent.",
      features: [
        "Seasonal exhibitions",
        "Focused artist presentations",
        "Thoughtful wall texts",
        "Calm viewing experience",
      ],
    },
    {
      icon: Layers3,
      title: "Private Viewings",
      description:
        "Book dedicated time with the gallery for a more personal conversation around the work.",
      features: [
        "Appointment-based visits",
        "Collector consultations",
        "Designer walk-throughs",
        "Tailored recommendations",
      ],
    },
    {
      icon: Sparkles,
      title: "Acquisition Support",
      description:
        "Receive practical guidance on available works, placement, framing, and the purchasing process.",
      features: [
        "Availability guidance",
        "Placement recommendations",
        "Framing discussion",
        "Purchase coordination",
      ],
    },
    {
      icon: BarChart3,
      title: "Gallery Programming",
      description:
        "The program extends beyond the walls through openings, conversations, and special events.",
      features: [
        "Opening receptions",
        "Artist conversations",
        "Collector previews",
        "Invitation-only evenings",
      ],
    },
    {
      icon: Users,
      title: "Designer & Advisor Collaboration",
      description:
        "We work with interior designers, stylists, and art advisors to source work for real spaces and briefs.",
      features: [
        "Project-based sourcing",
        "Palette-aligned selections",
        "Residential support",
        "Commercial placement",
      ],
    },
    {
      icon: Zap,
      title: "Membership Experience",
      description:
        "For regular visitors, our membership tiers offer closer access to the program and first notice on new work.",
      features: [
        "Preview invitations",
        "Priority viewing access",
        "Special programming",
        "Collector-facing updates",
      ],
    },
  ];

  const audiences = [
    "Collectors",
    "First-time buyers",
    "Interior designers",
    "Art advisors",
    "Curious visitors",
    "Corporate clients",
    "Hospitality projects",
    "Cultural patrons",
    "Architects",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pt-24">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-20">
          <MotionFade>
            <Heading variant="h1">
              EduthArt <span className="text-primary">Gallery Services</span>
            </Heading>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Everything at EduthArt is designed to make viewing, collecting,
              and placing contemporary art feel clearer, calmer, and more
              personal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/pricing">Explore Membership</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/about">Learn About EduthArt</Link>
              </Button>
            </div>
          </MotionFade>
        </div>

        <div className="mb-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => {
              const IconComponent = service.icon;
              return (
                <MotionFade key={index} delay={index * 0.1}>
                  <div className="group bg-card p-8 rounded-2xl border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors duration-300">
                      <IconComponent className="w-8 h-8 text-primary" />
                    </div>

                    <h3 className="text-xl font-bold mb-4 group-hover:text-primary transition-colors duration-300">
                      {service.title}
                    </h3>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {service.description}
                    </p>

                    <ul className="space-y-2 mb-6">
                      {service.features.map((feature, featureIndex) => (
                        <li
                          key={featureIndex}
                          className="flex items-start gap-2 text-sm"
                        >
                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </MotionFade>
              );
            })}
          </div>
        </div>

        <div className="mb-20">
          <MotionFade>
            <Heading variant="h2" className="text-center">
              Built For <span className="text-primary">Real Collectors</span>
            </Heading>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
              EduthArt supports people discovering their first artwork, placing
              work in finished interiors, or building a more established
              collection over time.
            </p>
          </MotionFade>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {audiences.map((audience, index) => (
              <MotionFade key={index} delay={index * 0.05}>
                <div className="bg-card p-4 rounded-lg border border-border/50 text-center hover:border-primary/50 transition-colors duration-300">
                  <span className="text-sm font-medium text-muted-foreground">
                    {audience}
                  </span>
                </div>
              </MotionFade>
            ))}
          </div>
        </div>

        <div className="mb-20">
          <MotionFade>
            <Heading variant="h2" className="text-center">
              Why Visitors Choose <span className="text-primary">EduthArt</span>
            </Heading>
          </MotionFade>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <MotionFade delay={0.1}>
              <div className="text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lightbulb className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-4">Thoughtful Curation</h3>
                <p className="text-muted-foreground">
                  Every exhibition is built to give the work space, rhythm, and
                  presence.
                </p>
              </div>
            </MotionFade>

            <MotionFade delay={0.2}>
              <div className="text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-4">Collector Guidance</h3>
                <p className="text-muted-foreground">
                  We help visitors move from interest to confidence without
                  unnecessary pressure.
                </p>
              </div>
            </MotionFade>

            <MotionFade delay={0.3}>
              <div className="text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-4">Lasting Relationships</h3>
                <p className="text-muted-foreground">
                  The gallery is built for repeat visits, stronger artist
                  relationships, and long-term trust.
                </p>
              </div>
            </MotionFade>
          </div>
        </div>

        <div className="text-center bg-card p-8 rounded-lg border">
          <MotionFade>
            <h2 className="text-3xl font-bold mb-4">
              Ready to experience EduthArt in person?
            </h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Request a private viewing, ask about a specific work, or learn
              which membership tier best fits the way you like to collect.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/contact">Plan a Visit</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/contact">Talk To Us</Link>
              </Button>
            </div>
          </MotionFade>
        </div>
      </div>
    </div>
  );
}
