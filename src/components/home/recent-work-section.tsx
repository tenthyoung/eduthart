import Link from "next/link";
import { MotionFade } from "../motion/motion-fade";
import { MotionStaggerFade } from "../motion/motion-stagger-fade";
import { Heading } from "../text/heading";
import { Button } from "../ui/button";
import { ChevronRight } from "lucide-react";

const portfolioItems = [
  {
    title: "LIMITLESS FITNESS",
    description: "BRINGING THE FITNESS WORLD TO A WHOLE NEW LEVEL",
  },
  {
    title: "STAGING SPACES INTERIORS",
    description:
      "ELEVATING THE TOP REAL ESTATE BROKER IN SAN DIEGO TO TAKE ON THE WORLD",
  },
  {
    title: "HONOR PLUS COMPANY",
    description:
      "CREATING A REGIONAL PRESENCE FOR A FORT WORTH BASED CLEANING COMPANY",
  },
  {
    title: "SPORTS MEDICINE INSTITUTE",
    description:
      "HELPING ONE OF ORANGE COUNTY'S TOP DOCTORS TO CREATE THEIR OWN FIRM",
  },
  {
    title: "CONCIERGE KEY HEALTH",
    description: "CREATING AN APP THAT REVOLUTIONIZED THE HEALTHCARE SPACE",
  },
  {
    title: "TOTAL NUTRITION APP",
    description: "BRIDGING THE GAP BETWEEN NUTRITION AND TOTAL BODY WELLNESS",
  },
];

export const RecentWorkSection = () => {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Section Header */}
        <MotionStaggerFade className="text-center mb-16">
          <Heading variant="h2">
            OUR RECENT <span className="text-primary">WORK</span>
          </Heading>
        </MotionStaggerFade>

        {/* Portfolio Grid */}
        <MotionStaggerFade className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {portfolioItems.map((item, index) => (
            <div
              key={index}
              className="bg-card p-8 rounded-2xl shadow-lg border hover:shadow-xl hover:border-primary transition-all duration-300 group cursor-pointer"
            >
              <div className="space-y-4">
                <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </MotionStaggerFade>

        {/* CTA Button */}
        <MotionFade className="flex justify-center">
          <Button size="lg" asChild>
            <Link href="/work">
              SEE OUR PORTFOLIO <ChevronRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </MotionFade>
      </div>
    </section>
  );
};
