"use client";

import { Button } from "@/components/ui/button";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Brain, Sparkles, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

export function HomeHero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const floatingCardsRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const orb3Ref = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !heroRef.current ||
      !titleRef.current ||
      !subtitleRef.current ||
      !ctaRef.current
    )
      return;

    // Animate elements on load
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(
      titleRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 0.8 },
    )
      .fromTo(
        subtitleRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6 },
        "-=0.4",
      )
      .fromTo(
        ctaRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5 },
        "-=0.3",
      );

    // Parallax scroll animations for background orbs
    if (orb1Ref.current && orb2Ref.current && orb3Ref.current) {
      // Orb 1 - moves up slowly
      gsap.to(orb1Ref.current, {
        y: -200,
        x: 100,
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.5,
        },
      });

      // Orb 2 - moves down and left
      gsap.to(orb2Ref.current, {
        y: 150,
        x: -100,
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 2,
        },
      });

      // Orb 3 - moves up faster
      gsap.to(orb3Ref.current, {
        y: -300,
        x: -50,
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    }

    // Parallax for main content - moves up slower than scroll
    const heroContentTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: heroRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 1,
      },
    });

    heroContentTimeline
      .to([titleRef.current, subtitleRef.current, ctaRef.current], {
        y: 0,
        opacity: 1,
        duration: 0.65,
      })
      .to([titleRef.current, subtitleRef.current, ctaRef.current], {
        y: 150,
        opacity: 0,
        duration: 0.35,
      });

    // Animate floating cards
    if (floatingCardsRef.current) {
      const cards = floatingCardsRef.current.querySelectorAll(".floating-card");
      cards.forEach((card, index) => {
        // Floating animation
        gsap.to(card, {
          y: "random(-20, 20)",
          x: "random(-15, 15)",
          rotation: "random(-5, 5)",
          duration: "random(3, 5)",
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: index * 0.2,
        });

        // Parallax scroll animation for cards
        gsap.to(card, {
          y: `random(-100, -300)`,
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 1.8 + index * 0.1,
          },
        });
      });
    }

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <div
      ref={heroRef}
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#fbf7f1] via-[#f2e8dc] to-[#eadbc8] pt-32 dark:from-[#1f1711] dark:via-[#2a2017] dark:to-[#140f0b] lg:items-start lg:pt-36"
    >
      {/* Animated gradient orbs */}
      <div ref={backgroundRef} className="absolute inset-0 overflow-hidden">
        <div
          ref={orb1Ref}
          className="absolute top-1/4 -left-48 h-96 w-96 animate-pulse rounded-full bg-[#c7ad8b]/30 blur-[128px] dark:bg-[#8d6e52] dark:mix-blend-multiply dark:opacity-35"
        />
        <div
          ref={orb2Ref}
          className="absolute top-1/3 -right-48 h-96 w-96 animate-pulse rounded-full bg-[#e6d6c4]/50 blur-[128px] dark:bg-[#6f533b] dark:mix-blend-multiply dark:opacity-25"
          style={{ animationDelay: "1s" }}
        />
        <div
          ref={orb3Ref}
          className="absolute -bottom-48 left-1/3 h-96 w-96 animate-pulse rounded-full bg-[#d9c8b5]/45 blur-[128px] dark:bg-[#a98963] dark:mix-blend-multiply dark:opacity-20"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Floating cards */}
      <div
        ref={floatingCardsRef}
        className="absolute inset-0 pointer-events-none"
      >
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="floating-card absolute h-20 w-32 rounded-xl border border-border/70 bg-card/70 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
            style={{
              top: `${Math.random() * 80 + 10}%`,
              left: `${Math.random() * 80 + 10}%`,
            }}
          >
            <div className="p-3 h-full flex flex-col justify-between">
              <div className="font-mono text-xs text-slate-500 dark:text-white/60">
                {i % 2 === 0 ? "EXH" : "CAT"}
              </div>
              <div className="flex gap-1">
                <div className="h-1 flex-1 rounded bg-primary/20 dark:bg-white/20" />
                <div className="h-1 flex-1 rounded bg-primary/20 dark:bg-white/20" />
                <div className="h-1 flex-1 rounded bg-primary/10 dark:bg-white/10" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Logo + Badge */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/30 blur-xl dark:bg-primary/40" />
            <Image
              src="/logo/eduthart-logo.png"
              alt="EduthArt Gallery"
              width={80}
              height={80}
              className="relative z-10"
            />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-primary/15 bg-card/85 px-4 py-2 text-foreground/85 shadow-[0_18px_50px_-28px_rgba(47,36,28,0.42)] backdrop-blur-md dark:border-white/20 dark:bg-white/10 dark:text-white">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Contemporary Art Gallery</span>
          </div>
        </div>

        {/* Title */}
        <h1
          ref={titleRef}
          className="mb-6 text-4xl font-bold leading-tight text-foreground dark:text-white sm:text-6xl md:text-7xl lg:text-8xl"
        >
          A Quiet Place
          <br />
          <span className="animate-gradient bg-gradient-to-r from-primary via-primary-light to-primary bg-clip-text text-transparent">
            for exceptional art.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="mx-auto mb-12 max-w-3xl text-lg leading-relaxed text-muted-foreground dark:text-slate-300 sm:text-xl md:text-2xl"
        >
          Discover curated exhibitions, private viewings, and collecting
          guidance in a gallery experience shaped for thoughtful looking.
        </p>

        {/* CTA Buttons */}
        <div
          ref={ctaRef}
          className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button
            asChild
            variant="gradient"
            size="2xl"
            className="group relative overflow-hidden"
          >
            <Link href="#visit">
              <Zap className="w-5 h-5 mr-2 group-hover:animate-pulse" />
              Plan Your Visit
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="2xl"
            className="border-primary/20 bg-card/75 text-foreground backdrop-blur-sm hover:bg-accent dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
          >
            <Link href="#features">
              <Brain className="w-5 h-5 mr-2" />
              Explore Exhibitions
            </Link>
          </Button>
        </div>

        {/* Stats */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-2">10M+</div>
            <div className="text-sm text-gray-400">Flashcards Created</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-2">95%</div>
            <div className="text-sm text-gray-400">Retention Rate</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-2">500K+</div>
            <div className="text-sm text-gray-400">Active Learners</div>
          </div>
        </div> */}
      </div>

      {/* Add custom styles for gradient animation */}
      <style jsx>{`
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
