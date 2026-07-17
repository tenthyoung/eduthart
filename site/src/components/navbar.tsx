"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { SocialIcon } from "@/components/ui/social-icon";
import { SOCIAL_MEDIA_LINKS } from "@/constants/social-media.constants";
import { ChevronRight, CircleUserRound, Linkedin, Loader2, LogOut, Menu, Settings, X } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { siFacebook, siInstagram, siX, siYoutube } from "simple-icons";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { signOut, status, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuToggleRef = useRef<HTMLButtonElement>(null);

  const navItems = [
    { name: "Browse Art", href: "/#browse" },
    { name: "Collections", href: "/#collections" },
    { name: "Advisory", href: "/#advisory" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

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
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

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
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "border-b border-border/50 bg-background/90 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div
        className={cn(
          "px-4 sm:px-6 lg:px-16",
          isScrolled ? "pt-4 pb-3" : "pt-8 pb-4",
        )}
      >
        <div className="flex items-center justify-between h-20 gap-6">
          {/* Left - Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-3">
            {/* <Image
              src="/logo/eduthart-logo.png"
              alt="EduthArt"
              width={48}
              height={48}
              priority
            /> */}
            <span className="font-serif text-2xl font-bold tracking-[-0.03em] text-foreground">
              EduthArt
            </span>
          </Link>

          {/* Center - Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-foreground/80 hover:text-foreground transition-colors duration-200 font-medium"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right - Theme Toggle & Hamburger Menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {status === "authenticated" ? (
              <div className="hidden items-center gap-2 lg:flex">
                <div className="rounded-full border border-border/70 bg-card/80 px-4 py-2 text-sm text-foreground shadow-sm backdrop-blur-sm">
                  <Link className="inline-flex items-center gap-2" href="/account">
                    <CircleUserRound className="size-4 text-primary" />
                    {user?.displayName || user?.email || "Signed in"}
                  </Link>
                </div>
                <Button asChild size="lg" variant="outline">
                  <Link href="/account">
                    <Settings />
                    Account
                  </Link>
                </Button>
                <Button
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                  size="lg"
                  variant="outline"
                >
                  {isSigningOut ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <LogOut />
                  )}
                  Log out
                </Button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 lg:flex">
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="lg" variant="gradient">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </div>
            )}
            <Button asChild variant="gradient" size="lg" className="hidden xl:inline-flex">
              <Link href="/#collections">Shop</Link>
            </Button>
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
            className="mt-2 rounded-lg border border-border/70 bg-card/95 pb-6 shadow-[0_24px_80px_-40px_rgba(47,36,28,0.45)] backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="space-y-2">
              {navItems.map((item, index) => (
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
                    {item.name}
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 space-y-4 border-t border-border/60 px-4 pt-6">
              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-foreground">
                  <span>Appearance</span>
                  <ThemeToggle />
                </div>
                {status === "authenticated" ? (
                  <>
                    <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-foreground">
                      Signed in as {user?.displayName || user?.email || "collector"}
                    </div>
                    <Button asChild className="w-full" variant="outline">
                      <Link href="/account" onClick={() => setIsMobileMenuOpen(false)}>
                        <Settings />
                        Account settings
                        <ChevronRight />
                      </Link>
                    </Button>
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
                      <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                        Log in
                      </Link>
                    </Button>
                    <Button asChild className="w-full" variant="gradient">
                      <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                        Sign up
                      </Link>
                    </Button>
                  </>
                )}
                <Button asChild className="w-full" variant="gradient">
                  <Link href="/#collections" onClick={() => setIsMobileMenuOpen(false)}>
                    Shop
                  </Link>
                </Button>
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
