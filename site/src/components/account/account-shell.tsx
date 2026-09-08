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
import type { ReactNode } from "react";

// Shared with the navbar profile dropdown and the account workspace sidebar
// so the menus never drift apart.
export const ACCOUNT_SECTIONS = [
  { href: "/account", icon: Settings, label: "Settings" },
  { href: "/account/favorites", icon: Heart, label: "Favorites" },
  { href: "/account/collections", icon: Images, label: "Collections" },
  { href: "/account/following", icon: UserRound, label: "Following" },
  { href: "/account/recommendations", icon: Sparkles, label: "For you" },
  { href: "/account/recently-viewed", icon: History, label: "Recently viewed" },
  { href: "/account/orders", icon: Receipt, label: "Purchases" },
  { href: "/account/addresses", icon: MapPin, label: "Addresses" },
  {
    href: "/account/payment-methods",
    icon: CreditCard,
    label: "Payment methods",
  },
  { href: "/notifications", icon: Bell, label: "Notifications" },
];

export function isAccountSectionActive(href: string, pathname: string) {
  return href === "/account"
    ? pathname === "/account"
    : pathname.startsWith(href);
}

/**
 * Content container for the account screens. The surrounding sidebar and
 * header come from AccountWorkspaceShell, which SiteShell wraps around every
 * /account route.
 */
export function AccountArea({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl">{children}</div>;
}

/**
 * AccountArea plus a heading, so each collector page supplies only its own
 * body.
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
  return (
    <AccountArea>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl text-foreground sm:text-5xl">{title}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {action}
      </div>

      <div className="mt-8">{children}</div>
    </AccountArea>
  );
}
