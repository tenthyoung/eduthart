"use client";

import { BrandMark } from "@/components/brand-mark";
import { ContactForm } from "@/components/form/contact-form";
import { MotionFade } from "../motion/motion-fade";
import { Heading } from "../text/heading";

export const ContactFormSection = () => {
  return (
    <section className="flex w-full items-center justify-center">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <MotionFade>
            <Heading variant="h2" className="mb-4">
              Ready to continue the{" "}
              <span className="text-primary">conversation?</span>
            </Heading>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Reach out for private viewings, acquisition inquiries, and
              exhibition information.
            </p>
          </MotionFade>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Contact Form */}
          <div className="order-1 lg:order-1">
            <MotionFade delay={0.2}>
              <div className="bg-card p-8 rounded-2xl border border-border/50 shadow-lg">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2 text-foreground">
                    Contact the Gallery
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Tell us what you&apos;re looking for and we&apos;ll respond
                    with the right next step.
                  </p>
                </div>
                <ContactForm />
              </div>
            </MotionFade>
          </div>

          {/* Image */}
          <div className="order-2 lg:order-2">
            <MotionFade delay={0.4}>
              <div className="relative flex h-96 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-[#faf8f3] via-[#e8e2d9] to-[#aaa39a] shadow-lg shadow-primary/10 dark:from-[#292827] dark:via-[#33312e] dark:to-[#3c3935] lg:h-[500px]">
                <BrandMark className="h-64 w-auto" />

                <div className="absolute inset-0 bg-gradient-to-t from-primary/18 to-transparent" />
              </div>
            </MotionFade>
          </div>
        </div>
      </div>
    </section>
  );
};
