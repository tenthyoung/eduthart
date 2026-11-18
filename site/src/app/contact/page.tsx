"use client";

import { ContactForm } from "@/components/form/contact-form";
import { MotionStaggerFade } from "@/components/motion/motion-stagger-fade";
import { Heading } from "@/components/text/heading";
import { SUPPORT_EMAIL } from "@/constants/contact.constants";
import { Mail } from "lucide-react";
export default function ContactPage() {
  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      details: [SUPPORT_EMAIL],
      description:
        "For questions about an artwork, an order, selling on EduthArt, press, or anything else.",
    },
  ];

  return (
    <div className="min-h-screen bg-background pt-24 text-foreground">
      <div className="container mx-auto max-w-6xl px-4 py-16">
        {/* Hero Section */}
        <MotionStaggerFade className="mb-16 text-center">
          <Heading variant="h1">
            <span className="text-primary">Contact</span> EduthArt
          </Heading>
          <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
            To ask about an artwork, an order, or selling on EduthArt, send a
            message and we&apos;ll reply by email.
          </p>
        </MotionStaggerFade>

        <MotionStaggerFade
          initialDelay={1}
          className="grid gap-12 lg:grid-cols-2"
        >
          {/* Contact Form */}
          <div className="rounded-lg border bg-card p-8">
            <h2 className="mb-6 text-2xl font-bold">Send an Inquiry</h2>
            <ContactForm />
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="mb-6 text-2xl font-bold">Email EduthArt</h2>
              <p className="mb-8 text-muted-foreground">
                We answer every question over email, so each reply can speak to
                your order, your collection, or your own work.
              </p>
            </div>

            <div className="grid gap-6">
              {contactInfo.map((info, index) => {
                const IconComponent = info.icon;
                return (
                  <div key={index} className="rounded-lg border bg-card p-6">
                    <div className="flex items-start">
                      <div className="mr-4 rounded-lg bg-primary/10 p-3">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="mb-2 font-semibold">{info.title}</h3>
                        {info.details.map((detail, detailIndex) => (
                          <a
                            key={detailIndex}
                            href={`mailto:${detail}`}
                            className="text-muted-foreground transition-colors hover:text-primary"
                          >
                            {detail}
                          </a>
                        ))}
                        <p className="mt-2 text-sm text-primary">
                          {info.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </MotionStaggerFade>
      </div>
    </div>
  );
}
