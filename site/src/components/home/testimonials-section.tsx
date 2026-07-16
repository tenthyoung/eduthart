"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { MotionStaggerFade } from "../motion/motion-stagger-fade";
import { Heading } from "../text/heading";

const testimonials = [
  {
    id: 1,
    quote:
      "EduthArt has a rare sense of restraint. The work is beautifully installed, the guidance is informed without being overbearing, and every visit feels considered.",
    name: "SARAH CHEN",
    title: "Collector",
    industry: "Contemporary Painting",
  },
  {
    id: 2,
    quote:
      "I often bring clients here when we need something with presence and long-term value. The gallery understands scale, palette, and how artwork has to live in a room.",
    name: "MARCUS RODRIGUEZ",
    title: "Interior Designer",
    industry: "Residential Projects",
  },
  {
    id: 3,
    quote:
      "What stands out most is the tone of the place. It feels official and deeply welcoming at the same time, which makes it easy to spend real time with the art.",
    name: "JENNIFER WILLIAMS",
    title: "Patron",
    industry: "Arts & Culture",
  },
];

export const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length,
    );
  };

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(nextTestimonial, 8000); // Change every 8 seconds
    return () => clearInterval(interval);
  }, []);

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="flex w-full items-center justify-center">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <MotionStaggerFade>
          <div className="text-center mb-16">
            <Heading variant="h1">Trusted by Collectors and Visitors</Heading>
          </div>

          {/* Testimonial Content */}
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Navigation Buttons */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-20 z-10 ">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevTestimonial}
                  className="h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm border hover:bg-background shadow-lg"
                >
                  <ChevronLeft size={20} />
                </Button>
              </div>

              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 lg:translate-x-20 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextTestimonial}
                  className="h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm border hover:bg-background shadow-lg"
                >
                  <ChevronRight size={20} />
                </Button>
              </div>

              {/* Testimonial Card */}
              <div className="bg-card border rounded-2xl p-8 lg:p-12 shadow-lg">
                <div className="text-center space-y-8">
                  {/* Quote */}
                  <blockquote className="text-lg md:text-xl lg:text-2xl text-foreground leading-relaxed italic">
                    &ldquo;{currentTestimonial.quote}&rdquo;
                  </blockquote>

                  {/* Attribution */}
                  <div className="space-y-2">
                    <div className="text-xl font-semibold text-foreground">
                      {currentTestimonial.name}
                    </div>
                    <div className="text-muted-foreground">
                      {currentTestimonial.title}
                    </div>
                    <div className="text-sm text-primary font-medium">
                      {currentTestimonial.industry}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center space-x-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-3 w-3 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? "bg-primary scale-125"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
          </div>
        </MotionStaggerFade>
      </div>
    </section>
  );
};
