"use client";

import type { AccountProfile } from "@/lib/auth/account-profile";
import { subscribeToUsernameUpdates } from "@/lib/auth/username-events";
import { useAuth } from "@/components/auth/auth-provider";
import { ACCOUNT_SECTIONS } from "@/components/account/account-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SocialIcon } from "@/components/ui/social-icon";
import { SOCIAL_MEDIA_LINKS } from "@/constants/social-media.constants";
import {
  Bell,
  ChevronRight,
  LayoutDashboard,
  LifeBuoy,
  Linkedin,
  Loader2,
  LogOut,
  Menu,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { siFacebook, siInstagram, siX, siYoutube } from "simple-icons";
import { buildBrowseHref } from "@/lib/artists/artwork-search";
import { isArtistCapableUsername } from "@/lib/navigation";
import {
  fetchNotifications,
  NOTIFICATIONS_CHANGED_EVENT,
} from "@/lib/notifications/client";
import { cn } from "@/lib/utils";
import { CartDrawer } from "@/components/commerce/cart-drawer";

type NavItem = {
  href: string;
  icon?: LucideIcon;
  name: string;
};

/** The categories named in the header, as labels people say and the values search uses. */
const HEADER_CATEGORIES = [
  { label: "Paintings", value: "Painting" },
  { label: "Photography", value: "Photography" },
  { label: "Sculpture", value: "Sculpture" },
  { label: "Ceramics", value: "Ceramic" },
  { label: "Drawing", value: "Drawing" },
];

export function Navbar() {
  const pathname = usePathname();
  const { signOut, status, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuToggleRef = useRef<HTMLButtonElement>(null);

  const isArtistCapable = isArtistCapableUsername(username);
  // Shopping comes first: the categories people browse by, then everything.
  const shopNavItems: NavItem[] = [
    ...HEADER_CATEGORIES.map((category) => ({
      name: category.label,
      href: buildBrowseHref({ category: category.value }),
    })),
    { name: "Browse all", href: "/browse" },
  ];
  const studioNavItems: NavItem[] =
    status === "authenticated" && isArtistCapable && username
      ? [
          {
            name: "Studio",
            href: `/artists/${username}/listings/new`,
            icon: LayoutDashboard,
          },
        ]
      : [];
  const desktopNavItems: NavItem[] = [...shopNavItems, ...studioNavItems];

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

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!isMobileMenuOpen) {
        return;
      }

      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !mobileMenuToggleRef.current?.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    }

    function handleResize() {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setUsername(null);
      setPhotoURL(null);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/auth/profile", {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { profile: AccountProfile };

        if (!cancelled) {
          setUsername(payload.profile.username ?? null);
          setPhotoURL(payload.profile.photoURL ?? null);
        }
      } catch {
        if (!cancelled) {
          setUsername(null);
          setPhotoURL(null);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [status, user]);

  useEffect(() => {
    return subscribeToUsernameUpdates((nextUsername) => {
      setUsername(nextUsername);
    });
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setUnreadNotifications(0);
      return;
    }

    let cancelled = false;

    const loadUnreadCount = async () => {
      try {
        const payload = await fetchNotifications(await user.getIdToken());

        if (!cancelled) {
          setUnreadNotifications(payload.unreadCount);
        }
      } catch {
        // The badge is decorative, so a failed poll simply leaves it as it was.
      }
    };

    void loadUnreadCount();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, loadUnreadCount);

    return () => {
      cancelled = true;
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, loadUnreadCount);
    };
  }, [status, user]);

  // The profile payload wins over the Firebase user so a freshly uploaded
  // avatar shows up without a re-login; the auth photo covers the first render.
  const avatarUrl = photoURL ?? user?.photoURL ?? null;
  const displayLabel = user?.displayName || user?.email || "Account";
  const profileBadge = (
    <ProfileAvatar
      email={user?.email}
      name={user?.displayName}
      photoURL={avatarUrl}
      seed={user?.uid}
    />
  );

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await signOut();
      setIsMobileMenuOpen(false);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <nav
      // Radix overlays (select, dialog, drawer) lock body scroll and hide the
      // scrollbar, which would let this fixed bar stretch into the reclaimed
      // gutter and shove its right-hand controls sideways. Inset it by the
      // width Radix removed so the bar stays put while a menu is open.
      className="fixed top-0 left-0 right-[var(--removed-body-scroll-bar-size,0px)] z-50 border-b border-border bg-background/95 backdrop-blur-xl"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-8">
          {/* Left - Wordmark */}
          <Link
            href="/"
            className="flex-shrink-0 font-display text-[1.75rem] leading-none text-foreground"
          >
            EduthArt
          </Link>

          {/* Center - Desktop Navigation */}
          <div className="hidden flex-1 items-center gap-6 lg:flex">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              const isCurrent = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className="text-[15px] font-medium text-foreground/80 transition-colors duration-200 hover:text-foreground"
                >
                  <span className="inline-flex items-center gap-2">
                    {Icon ? <Icon className="size-4" /> : null}
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Right - Theme Toggle & Hamburger Menu */}
          <div className="flex items-center gap-2">
            <CartDrawer />
            <ThemeToggle />
            {status === "authenticated" ? (
              <div className="hidden items-center gap-2 lg:flex">
                <Button
                  asChild
                  className="relative"
                  size="icon"
                  variant="outline"
                >
                  <Link
                    aria-label={
                      unreadNotifications > 0
                        ? `Notifications, ${unreadNotifications} unread`
                        : "Notifications"
                    }
                    href="/notifications"
                  >
                    <Bell />
                    {unreadNotifications > 0 ? (
                      <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold leading-5 text-white">
                        {unreadNotifications}
                      </span>
                    ) : null}
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label="Account menu"
                      className="cursor-pointer rounded-full ring-offset-background transition-shadow outline-none hover:ring-2 hover:ring-primary/35 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      type="button"
                    >
                      <ProfileAvatar
                        email={user?.email}
                        name={user?.displayName}
                        photoURL={avatarUrl}
                        seed={user?.uid}
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {username ? (
                      <DropdownMenuItem asChild className="p-2">
                        <Link href={`/artists/${username}`}>
                          {profileBadge}
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {displayLabel}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              @{username}
                            </span>
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuLabel className="flex items-center gap-2 p-2 font-normal">
                        {profileBadge}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {displayLabel}
                          </span>
                          {user?.email ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          ) : null}
                        </span>
                      </DropdownMenuLabel>
                    )}
                    <DropdownMenuSeparator />
                    {ACCOUNT_SECTIONS.map((section) => {
                      const Icon = section.icon;

                      return (
                        <DropdownMenuItem asChild key={section.href}>
                          <Link href={section.href}>
                            <Icon />
                            {section.label}
                            {section.href === "/notifications" &&
                            unreadNotifications > 0 ? (
                              <span className="ml-auto inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                                {unreadNotifications}
                              </span>
                            ) : null}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/contact">
                        <LifeBuoy />
                        Customer support
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={isSigningOut}
                      onSelect={() => void handleSignOut()}
                    >
                      {isSigningOut ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <LogOut />
                      )}
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="hidden items-center lg:flex">
                <Button asChild variant="ghost">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            )}
            <Button
              ref={mobileMenuToggleRef}
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="text-foreground hover:bg-accent lg:hidden"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? <X size={48} /> : <Menu size={48} />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            className="mb-4 rounded-2xl border border-border bg-card pb-6 shadow-[0_24px_60px_-36px_rgba(31,31,31,0.35)] lg:hidden"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="space-y-2">
              {desktopNavItems.map((item, index) => {
                const Icon = item.icon;

                return (
                  <motion.div
                    key={item.name}
                    className={cn(index === 0 && "mt-2")}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.22,
                      delay: 0.06 + index * 0.05,
                      ease: "easeOut",
                    }}
                  >
                    <Link
                      href={item.href}
                      className="block rounded-md px-4 py-3 text-foreground transition-colors duration-200 hover:bg-accent"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="inline-flex items-center gap-2">
                        {Icon ? <Icon className="size-4" /> : null}
                        {item.name}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-6 space-y-4 border-t border-border/60 px-4 pt-6">
              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground">
                  <span>Appearance</span>
                  <ThemeToggle />
                </div>
                {status === "authenticated" ? (
                  <>
                    <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground">
                      Signed in as{" "}
                      {user?.displayName || user?.email || "collector"}
                    </div>
                    <Button asChild className="w-full" variant="outline">
                      <Link
                        href="/notifications"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Bell />
                        Notifications
                        {unreadNotifications > 0 ? (
                          <span className="ml-auto inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                            {unreadNotifications}
                          </span>
                        ) : null}
                      </Link>
                    </Button>
                    <Button asChild className="w-full" variant="outline">
                      <Link
                        href="/account"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Settings />
                        Account settings
                        <ChevronRight />
                      </Link>
                    </Button>
                    {username ? (
                      <Button asChild className="w-full" variant="default">
                        <Link
                          href={`/artists/${username}/listings/new`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <LayoutDashboard />
                          Studio
                        </Link>
                      </Button>
                    ) : null}
                    <Button
                      className="w-full"
                      disabled={isSigningOut}
                      onClick={handleSignOut}
                      variant="outline"
                    >
                      {isSigningOut ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <LogOut />
                      )}
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild className="w-full" variant="outline">
                      <Link
                        href="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Sign in
                      </Link>
                    </Button>
                    <Button asChild className="w-full" variant="default">
                      <Link
                        href="/signup"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Create account
                      </Link>
                    </Button>
                  </>
                )}
              </div>

              {/* Mobile Social Icons */}
              <div className="flex items-center justify-center space-x-6">
                {socialIcons.map((socialIcon) => {
                  if (socialIcon.isLucide) {
                    const IconComponent = socialIcon.icon;
                    return (
                      <Link
                        key={socialIcon.label}
                        href={socialIcon.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground/80 transition-colors duration-200 hover:text-primary"
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
                    />
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}
