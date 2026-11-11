"use client";

import { Bell, Loader2, LogOut, Palette, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import {
  ACCOUNT_SECTIONS,
  isAccountSectionActive,
} from "@/components/account/account-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  WorkspaceShell,
  type WorkspaceNavItem,
} from "@/components/workspace-shell";
import type { AccountProfile } from "@/lib/auth/account-profile";
import { subscribeToUsernameUpdates } from "@/lib/auth/username-events";
import { isArtistCapableUsername } from "@/lib/navigation";

const ACCOUNT_NAV_ITEMS: WorkspaceNavItem[] = ACCOUNT_SECTIONS.map(
  (section) => ({
    href: section.href,
    icon: section.icon,
    isActive: (pathname) => isAccountSectionActive(section.href, pathname),
    label: section.label,
  })
);

/**
 * Dashboard-style chrome for every /account screen, mirroring the artist
 * workspace: full-height sidebar between the account sections, header row,
 * and a sign-out footer. Rendered by SiteShell instead of the marketing
 * navbar.
 */
export function AccountWorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { signOut, status, user } = useAuth();
  const activeSection = ACCOUNT_SECTIONS.find((section) =>
    isAccountSectionActive(section.href, pathname)
  );
  const [username, setUsername] = useState<string | null>(null);

  // Same lookup as the navbar's Studio link: an account with a username can
  // list straight away, anyone else is sent to the Sell page to apply.
  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setUsername(null);
      return;
    }

    let cancelled = false;

    const loadUsername = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/auth/profile", {
          headers: { authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { profile: AccountProfile };

        if (!cancelled) {
          setUsername(payload.profile.username ?? null);
        }
      } catch {
        if (!cancelled) {
          setUsername(null);
        }
      }
    };

    void loadUsername();

    return () => {
      cancelled = true;
    };
  }, [status, user]);

  useEffect(() => subscribeToUsernameUpdates(setUsername), []);

  const listArtHref =
    isArtistCapableUsername(username) && username
      ? `/artists/${username}/listings/new`
      : "/for-artists";

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <WorkspaceShell
      headerActions={
        <>
          <ThemeToggle />
          <Button asChild className="relative" size="icon" variant="outline">
            <Link aria-label="Notifications" href="/notifications">
              <Bell className="size-4" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/browse">
              <Palette className="size-4" />
              Browse art
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={listArtHref}>
              <Plus className="size-4" />
              List your art
            </Link>
          </Button>
        </>
      }
      headerTitle={activeSection?.label ?? "My Account"}
      navItems={ACCOUNT_NAV_ITEMS}
      navLabel="My account"
      sidebarFooter={
        <>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {user?.displayName || user?.email || "Your account"}
            </p>
            {user?.email ? (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            ) : null}
          </div>
          <div className="mt-4 grid gap-1">
            <Button
              className="justify-start"
              disabled={status !== "authenticated"}
              onClick={() => void handleSignOut()}
              variant="ghost"
            >
              {status === "loading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Sign out
            </Button>
          </div>
        </>
      }
      sidebarId="account-sidebar"
    >
      {children}
    </WorkspaceShell>
  );
}
