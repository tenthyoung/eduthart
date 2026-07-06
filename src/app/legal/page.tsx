import { MotionFade } from "@/components/motion/motion-fade";
import { Heading } from "@/components/text/heading";
import Link from "next/link";

const policies = [
  {
    title: "Terms of Service",
    href: "/legal/terms-of-service",
    description:
      "How EduthArt accounts, subscriptions, public sharing, AI features, and platform rules work.",
  },
  {
    title: "Privacy Policy",
    href: "/legal/privacy-policy",
    description:
      "What account, study, billing, AI, and support data we collect, how we use it, and the choices you have.",
  },
  {
    title: "Study Content Policy",
    href: "/legal/content-policy",
    description:
      "Rules for public decks, comments, ratings, copyrighted material, abuse, and moderation enforcement.",
  },
  {
    title: "DMCA & Copyright",
    href: "/legal/dmca",
    description:
      "How to report copyrighted material in public decks and submit a formal DMCA notice.",
  },
  {
    title: "Refund & Cancellation Policy",
    href: "/legal/refund-cancellation-policy",
    description:
      "How subscriptions are managed, what refund requests look like, and where Apple and Google control billing.",
  },
  {
    title: "Accessibility Statement",
    href: "/legal/accessibility",
    description:
      "How we think about accessibility today and how to report issues or request help using EduthArt.",
  },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-background pt-24 text-foreground">
      <section className="py-16 lg:py-24">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <MotionFade>
            <div className="mx-auto max-w-3xl text-center">
              <Heading variant="h2" className="mb-4">
                Legal & <span className="text-primary">Policies</span>
              </Heading>
              <p className="text-lg text-muted-foreground">
                EduthArt&apos;s current policy set is written around how the
                product actually works today. These pages are product-aligned
                drafts and should still receive legal review before being
                treated as counsel-approved documents.
              </p>
            </div>
          </MotionFade>

          <div className="mt-12 grid gap-5">
            {policies.map((policy, index) => (
              <MotionFade key={policy.href} delay={0.08 * index}>
                <Link
                  href={policy.href}
                  className="block rounded-[1.75rem] border border-border/60 bg-card/90 p-7 transition-colors duration-200 hover:border-primary/35 hover:bg-card"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-3xl">
                      <h2 className="text-2xl font-semibold tracking-tight">
                        {policy.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {policy.description}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      Read policy
                    </span>
                  </div>
                </Link>
              </MotionFade>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
