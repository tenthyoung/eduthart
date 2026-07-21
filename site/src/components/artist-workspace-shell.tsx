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
  Menu,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { buildArtistPageHref } from "@/lib/auth/account-profile";
import { cn } from "@/lib/utils";

type ArtistWorkspaceShellProps = {
  children: ReactNode;
  username: string;
};

type ArtistNavItem = {
  badge?: string;
  href?: string;
  icon: ComponentType<{ className?: string }>;
  isActive?: (pathname: string) => boolean;
  label: string;
};

function buildArtistNavItems(username: string): ArtistNavItem[] {
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
      isActive: (pathname) => pathname.startsWith(`/artists/${username}/listings`),
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navItems = buildArtistNavItems(username);
  const publicGalleryHref = buildArtistPageHref(username);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {isMobileSidebarOpen ? (
          <button
            aria-label="Close sidebar"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
            type="button"
          />
        ) : null}

        <aside
          id="artist-dashboard-sidebar"
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-border/40 bg-background transition-[transform,width] duration-200 lg:static lg:z-auto",
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            isSidebarCollapsed ? "lg:w-16 lg:overflow-hidden" : "lg:w-64",
          )}
        >
          <div
            className={cn(
              "flex h-16 shrink-0 items-center border-b border-border/40",
              isSidebarCollapsed ? "lg:justify-center lg:px-2" : "px-6",
            )}
          >
            <Link
              href="/"
              className={cn(
                "flex shrink-0 items-center gap-3",
                isSidebarCollapsed && "lg:hidden",
              )}
            >
              <span className="font-serif text-2xl font-bold tracking-[-0.03em] text-foreground">
                EduthArt
              </span>
            </Link>
            <Button
              aria-label="Close sidebar"
              aria-controls="artist-dashboard-sidebar"
              className="ml-auto lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
              size="icon"
              variant="ghost"
            >
              <X className="size-5" />
            </Button>
            <Button
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-controls="artist-dashboard-sidebar"
              aria-expanded={!isSidebarCollapsed}
              className={cn("hidden lg:inline-flex", !isSidebarCollapsed && "ml-auto")}
              onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
              size="icon"
              variant="ghost"
            >
              <Menu className="size-5" />
            </Button>
          </div>

          <div className={cn("px-4 py-5", isSidebarCollapsed && "lg:hidden")}>
            <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Artist dashboard
            </p>
            <ArtistSidebarNav items={navItems} pathname={pathname} />
          </div>

          <div className={cn("mt-auto border-t border-border p-4", isSidebarCollapsed && "lg:hidden")}>
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
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="bg-background">
            <div className="flex min-h-16 flex-col gap-4 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div className="flex items-center gap-3">
                <Button
                  aria-label="Open sidebar"
                  aria-controls="artist-dashboard-sidebar"
                  aria-expanded={isMobileSidebarOpen}
                  className="lg:hidden"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  size="icon"
                  variant="ghost"
                >
                  <Menu className="size-5" />
                </Button>
                <Link
                  href="/"
                  className={cn(
                    "shrink-0 items-center gap-3",
                    isSidebarCollapsed ? "hidden lg:flex" : "hidden",
                  )}
                >
                  <span className="font-serif text-2xl font-bold tracking-[-0.03em] text-foreground">
                    EduthArt
                  </span>
                </Link>
                <div>
                  <Link
                    href="/"
                    className="mb-1 flex shrink-0 items-center gap-3 lg:hidden"
                  >
                    <span className="font-serif text-2xl font-bold tracking-[-0.03em] text-foreground">
                      EduthArt
                    </span>
                  </Link>
                  <h1 className="text-lg font-semibold tracking-tight text-foreground">
                    {pathname.startsWith(`/artists/${username}/listings/`) &&
                    pathname !== `/artists/${username}/listings/new`
                      ? "Listing Editor"
                      : "Listings Dashboard"}
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
              </div>
            </div>

            <nav className="flex gap-1 overflow-x-auto px-4 pb-2 sm:px-6 lg:hidden">
              {navItems.map((item) => {
                const active = item.isActive?.(pathname) ?? false;

                if (!item.href) {
                  return (
                    <span
                      key={item.label}
                      className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground"
                    >
                      {item.label}
                      {item.badge ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]">
                          {item.badge}
                        </span>
                      ) : null}
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "shrink-0 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main className="min-w-0 flex-1 bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function ArtistSidebarNav({
  items,
  pathname,
}: {
  items: ArtistNavItem[];
  pathname: string;
}) {
  return (
    <nav className="space-y-1">
      {items.map(({ badge, href, icon: Icon, isActive, label }) => {
        const active = isActive?.(pathname) ?? false;

        if (!href) {
          return (
            <div
              key={label}
              className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-3">
                <Icon className="size-4" />
                {label}
              </span>
              {badge ? (
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                  {badge}
                </span>
              ) : null}
            </div>
          );
        }

        return (
          <Link
            key={label}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
