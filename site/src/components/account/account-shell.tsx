"use client";

import {
  Bell,
  CreditCard,
  Heart,
  History,
  Images,
  MapPin,
  Receipt,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/account", icon: Settings, label: "Settings" },
  { href: "/account/favorites", icon: Heart, label: "Favorites" },
  { href: "/account/collections", icon: Images, label: "Collections" },
  { href: "/account/following", icon: UserRound, label: "Following" },
  { href: "/account/recommendations", icon: Sparkles, label: "For you" },
  { href: "/account/recently-viewed", icon: History, label: "Recently viewed" },
  { href: "/account/orders", icon: Receipt, label: "Purchases" },
  { href: "/account/addresses", icon: MapPin, label: "Addresses" },
  { href: "/account/payment-methods", icon: CreditCard, label: "Payment methods" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
];

/**
 * Chrome shared by every collector screen.
 *
 * The account area grew from one page to ten, so the navigation between them
 * lives here rather than being repeated, and each page supplies only its own
 * heading and body.
 */
export function AccountShell({
  action,
  children,
  description,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  description: string;
  title: string;
}) {
  const pathname = usePathname();

  return (
    <section className="min-h-screen bg-white px-4 pb-20 pt-36 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <nav aria-label="Account sections" className="mb-8 overflow-x-auto">
          <ul className="flex min-w-max gap-2">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive =
                section.href === "/account" ? pathname === "/account" : pathname.startsWith(section.href);

              return (
                <li key={section.href}>
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border/70 bg-white text-muted-foreground hover:text-foreground",
                    )}
                    href={section.href}
                  >
                    <Icon className="size-4" />
                    {section.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl text-foreground sm:text-5xl">{title}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>
          {action}
        </div>

        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
