"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CircleUserRound,
  ExternalLink,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings,
  Wallet,
} from "lucide-react";
import { type ReactNode } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  WorkspaceShell,
  type WorkspaceNavItem,
} from "@/components/workspace-shell";
import { buildArtistPageHref } from "@/lib/auth/account-profile";

type ArtistWorkspaceShellProps = {
  children: ReactNode;
  username: string;
};

function buildArtistNavItems(username: string): WorkspaceNavItem[] {
  const publicGalleryHref = buildArtistPageHref(username);
  const listingsHref = `/artists/${username}/listings/new`;

  return [
    {
      badge: "Soon",
      icon: LayoutDashboard,
      label: "Overview",
    },
    {
      href: listingsHref,
      icon: ImagePlus,
      isActive: (pathname) =>
        pathname.startsWith(`/artists/${username}/listings`),
      label: "Listings",
    },
    {
      href: publicGalleryHref,
      icon: ExternalLink,
      isActive: (pathname) => pathname === publicGalleryHref,
      label: "Public Gallery",
    },
    {
      href: "/account",
      icon: CircleUserRound,
      isActive: (pathname) => pathname === "/account",
      label: "Profile",
    },
    {
      badge: "Soon",
      icon: Wallet,
      label: "Orders & Payouts",
    },
    {
      href: "/account",
      icon: Settings,
      isActive: (pathname) => pathname === "/account",
      label: "Settings",
    },
  ];
}

export function ArtistWorkspaceShell({
  children,
  username,
}: ArtistWorkspaceShellProps) {
  const pathname = usePathname();
  const { signOut, status, user } = useAuth();
  const navItems = buildArtistNavItems(username);
  const publicGalleryHref = buildArtistPageHref(username);

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
            <Link href="/account">
              <CircleUserRound className="size-4" />
              Account
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={publicGalleryHref}>
              <ExternalLink className="size-4" />
              View public gallery
            </Link>
          </Button>
        </>
      }
      headerTitle={
        pathname.startsWith(`/artists/${username}/listings/`) &&
        pathname !== `/artists/${username}/listings/new`
          ? "Listing Editor"
          : "Listings Dashboard"
      }
      navItems={navItems}
      navLabel="Artist dashboard"
      sidebarFooter={
        <>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {user?.displayName || user?.email || "Artist account"}
            </p>
            <p className="text-xs text-muted-foreground">@{username}</p>
          </div>
          <div className="mt-4 grid gap-1">
            <Button asChild className="justify-start" variant="ghost">
              <Link href={publicGalleryHref}>
                <ExternalLink className="size-4" />
                View public gallery
              </Link>
            </Button>
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
      sidebarId="artist-dashboard-sidebar"
    >
      {children}
    </WorkspaceShell>
  );
}
