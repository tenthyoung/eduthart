"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MotionFade } from "../motion/motion-fade";
import { Heading } from "../text/heading";

export const FaqSection = () => {
  const faqs = [
    {
      question: "Do I need an appointment to visit the gallery?",
      answer:
        "Walk-ins are welcome during public hours, but private appointments are recommended if you want dedicated time with the work or would like to discuss a purchase in detail.",
    },
    {
      question: "Can I preview available works before visiting?",
      answer:
        "Yes. We share selected works, exhibition notes, and availability updates online so you can get oriented before you come in or request a private viewing.",
    },
    {
      question: "Do you help with collecting and placement decisions?",
      answer:
        "Absolutely. We regularly advise first-time and experienced collectors on scale, framing, placement, and how a work might live within a residential or commercial interior.",
    },
    {
      question: "Can interior designers or advisors work with the gallery?",
      answer:
        "Yes. We welcome collaborations with designers, stylists, architects, and art advisors, and we can help source works that align with a project palette or brief.",
    },
    {
      question: "What kinds of artists does EduthArt exhibit?",
      answer:
        "Our program focuses on contemporary artists whose work rewards close looking, material sensitivity, and a strong point of view across painting, sculpture, and mixed media.",
    },
    {
      question: "Do you ship artwork outside Southern California?",
      answer:
        "We can coordinate domestic shipping and discuss delivery options case by case for larger works, framed pieces, or collector installations that need extra care.",
    },
    {
      question: "What does gallery membership include?",
      answer:
        "Membership is designed for regular visitors and collectors, with benefits such as preview access, invitation-only events, collecting guidance, and first notice when new work arrives.",
    },
  ];

  return (
    <section className="flex w-full items-center justify-center">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <MotionFade>
          <div className="text-center mb-12">
            <Heading variant="h2" className="mb-4">
              Frequently Asked <span className="text-primary">Questions</span>
            </Heading>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Answers to common questions about visiting, collecting, and
              working with EduthArt.
            </p>
          </div>
        </MotionFade>

        <MotionFade delay={0.2}>
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border/50 rounded-lg px-6"
              >
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="font-semibold text-foreground">
                    {faq.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <p className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </MotionFade>
      </div>
    </section>
  );
};
