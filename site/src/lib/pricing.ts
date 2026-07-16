export type BillingPeriod = "monthly" | "annual";

export type PricingFeature = {
  title: string;
  description: string;
};

export type PricingPlan = {
  id: "free" | "plus" | "pro";
  name: string;
  eyebrow: string;
  highlightTag?: string;
  description: string;
  prices: Record<BillingPeriod, string>;
  billingLabels: Partial<Record<BillingPeriod, string>>;
  highlightPills: string[];
  features: PricingFeature[];
  ctaLabel: string;
};

export const pricingPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Visitor",
    eyebrow: "Complimentary",
    description:
      "A simple way to stay connected to the gallery and visit at your own pace.",
    prices: {
      monthly: "Free",
      annual: "Free",
    },
    billingLabels: {},
    highlightPills: [
      "Public exhibition access",
      "Gallery email list",
      "Online highlights",
    ],
    features: [
      {
        title: "Exhibition announcements",
        description:
          "Receive updates when new shows open and selected works arrive.",
      },
      {
        title: "Online viewing access",
        description: "Browse featured works and exhibition notes remotely.",
      },
      {
        title: "Public event invitations",
        description: "Stay informed about openings and gallery programming.",
      },
      {
        title: "Complimentary gallery entry",
        description:
          "Visit during standard public hours whenever you would like to stop in.",
      },
    ],
    ctaLabel: "Join as Visitor",
  },
  {
    id: "plus",
    name: "Patron Circle",
    eyebrow: "Most popular",
    highlightTag: "Member favorite",
    description:
      "For regular visitors who want earlier access, quieter time, and closer contact with the program.",
    prices: {
      monthly: "$6.99/mo",
      annual: "$5.00/mo",
    },
    billingLabels: {
      monthly: "billed monthly",
      annual: "$59.99 billed yearly",
    },
    highlightPills: ["Preview access", "Private-view windows", "Priority notices"],
    features: [
      {
        title: "Preview invitations",
        description:
          "See exhibitions before public openings and reserve quieter viewing times.",
      },
      {
        title: "Priority viewing requests",
        description: "Request private appointments with faster scheduling support.",
      },
      {
        title: "Member-only updates",
        description: "Receive early notice when notable new works become available.",
      },
    ],
    ctaLabel: "Choose Patron Circle",
  },
  {
    id: "pro",
    name: "Collector Circle",
    eyebrow: "For active collectors",
    highlightTag: "Top tier",
    description:
      "A higher-touch membership for collectors who want first access and more tailored guidance.",
    prices: {
      monthly: "$9.99/mo",
      annual: "$7.50/mo",
    },
    billingLabels: {
      monthly: "billed monthly",
      annual: "$89.99 billed yearly",
    },
    highlightPills: [
      "First-look access",
      "Concierge guidance",
      "Collector events",
    ],
    features: [
      {
        title: "First notice on new work",
        description:
          "Get the earliest possible visibility into incoming works and special releases.",
      },
      {
        title: "Concierge-style support",
        description: "Receive more tailored guidance on acquisitions, placement, and follow-up.",
      },
      {
        title: "Invitation-only programming",
        description: "Access select events and collector-facing conversations beyond public openings.",
      },
    ],
    ctaLabel: "Choose Collector Circle",
  },
];
