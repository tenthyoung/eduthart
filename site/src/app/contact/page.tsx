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
    <div className="min-h-screen bg-background text-foreground pt-24">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Hero Section */}
        <MotionStaggerFade className="text-center mb-16">
          <Heading variant="h1">
            <span className="text-primary">Contact</span> EduthArt
          </Heading>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            To ask about an artwork, an order, or selling on EduthArt, send a
            message and we&apos;ll reply by email.
          </p>
        </MotionStaggerFade>

        <MotionStaggerFade
          initialDelay={1}
          className="grid lg:grid-cols-2 gap-12"
        >
          {/* Contact Form */}
          <div className="bg-card p-8 rounded-lg border">
            <h2 className="text-2xl font-bold mb-6">Send an Inquiry</h2>
            <ContactForm />
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6">Email EduthArt</h2>
              <p className="text-muted-foreground mb-8">
                We answer every question over email, so each reply can speak to
                your order, your collection, or your own work.
              </p>
            </div>

            <div className="grid gap-6">
              {contactInfo.map((info, index) => {
                const IconComponent = info.icon;
                return (
                  <div key={index} className="bg-card p-6 rounded-lg border">
                    <div className="flex items-start">
                      <div className="bg-primary/10 p-3 rounded-lg mr-4">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">{info.title}</h3>
                        {info.details.map((detail, detailIndex) => (
                          <a
                            key={detailIndex}
                            href={`mailto:${detail}`}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            {detail}
                          </a>
                        ))}
                        <p className="text-sm text-primary mt-2">
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
