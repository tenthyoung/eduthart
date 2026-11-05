"use client";

import { NewsletterSignup } from "@/components/newsletter-signup";
import { SocialIcon } from "@/components/ui/social-icon";
import { SOCIAL_MEDIA_LINKS } from "@/constants/social-media.constants";
import { Linkedin } from "lucide-react";
import Link from "next/link";
import { siFacebook, siInstagram, siX, siYoutube } from "simple-icons";

const linkColumns = [
  {
    title: "Buying",
    links: [
      { name: "Browse all art", href: "/browse" },
      {
        name: "Shipping and returns",
        href: "/legal/refund-cancellation-policy",
      },
      { name: "Contact us", href: "/contact" },
    ],
  },
  {
    title: "Artists",
    links: [
      { name: "Sell on EduthArt", href: "/for-artists" },
      { name: "Apply to sell", href: "/apply-to-be-an-artist" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "/about" },
      { name: "Journal", href: "/blog" },
    ],
  },
];

const legalLinks = [
  { name: "Terms of Service", href: "/legal/terms-of-service" },
  { name: "Privacy Policy", href: "/legal/privacy-policy" },
  { name: "Content Policy", href: "/legal/content-policy" },
  {
    name: "Refund & Cancellation",
    href: "/legal/refund-cancellation-policy",
  },
  { name: "Legal", href: "/legal" },
];

export function Footer() {
  const socialIcons = [
    {
      iconPath: siInstagram.path,
      href: SOCIAL_MEDIA_LINKS.INSTAGRAM,
      label: "Instagram",
    },
    {
      iconPath: siFacebook.path,
      href: SOCIAL_MEDIA_LINKS.FACEBOOK,
      label: "Facebook",
    },
    { iconPath: siX.path, href: SOCIAL_MEDIA_LINKS.X, label: "X" },
    {
      iconPath: siYoutube.path,
      href: SOCIAL_MEDIA_LINKS.YOUTUBE,
      label: "Youtube",
    },
    {
      icon: Linkedin,
      href: SOCIAL_MEDIA_LINKS.LINKEDIN,
      label: "LinkedIn",
      isLucide: true,
    },
  ];

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 py-14 lg:grid-cols-[1.1fr_repeat(3,minmax(0,0.6fr))_1.4fr] lg:gap-10 lg:py-16">
          <div className="space-y-5">
            <Link
              href="/"
              className="font-display text-[1.75rem] leading-none text-foreground"
            >
              EduthArt
            </Link>
            <p className="max-w-xs text-sm leading-6 text-muted-foreground">
              Original art, bought straight from the people who make it.
            </p>
            <div className="flex gap-5">
              {socialIcons.map((socialIcon) => {
                if (socialIcon.isLucide) {
                  const IconComponent = socialIcon.icon;
                  return (
                    <Link
                      key={socialIcon.label}
                      href={socialIcon.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
                      aria-label={socialIcon.label}
                    >
                      <IconComponent size={20} />
                    </Link>
                  );
                }
                return (
                  <SocialIcon
                    key={socialIcon.label}
                    iconPath={socialIcon.iconPath!}
                    href={socialIcon.href}
                    label={socialIcon.label}
                    size={20}
                    variant="footer"
                  />
                );
              })}
            </div>
          </div>

          {linkColumns.map((column) => (
            <nav aria-label={column.title} key={column.title}>
              <p className="text-sm font-semibold text-foreground">
                {column.title}
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                {column.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              New work from the studios, once a week
            </h3>

            <NewsletterSignup />
          </div>
        </div>

        <div className="border-t border-border py-6">
          <div className="flex flex-col gap-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {legalLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="transition-colors duration-200 hover:text-foreground"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div>© 2026 Hendeca Labs LLC • Founded by Izzy Young</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
