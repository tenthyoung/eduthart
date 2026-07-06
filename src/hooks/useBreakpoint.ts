"use client";

import { useBreakpoint } from "use-breakpoint";

// Tailwind CSS default breakpoints
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

// Custom hook that provides Tailwind breakpoints
export const useTailwindBreakpoint = () => {
  const { breakpoint, maxWidth, minWidth } = useBreakpoint(
    BREAKPOINTS,
    "sm", // default breakpoint
  );

  const safeMaxWidth = maxWidth ?? 0;
  const safeMinWidth = minWidth ?? 0;

  return {
    breakpoint: breakpoint as BreakpointKey,
    maxWidth,
    minWidth,
    // Mobile and Desktop
    isMobile: safeMaxWidth < BREAKPOINTS.md,
    isMobileOrTablet:
      safeMaxWidth >= BREAKPOINTS.md && safeMaxWidth < BREAKPOINTS.lg,
    isDesktop: safeMinWidth >= BREAKPOINTS.md,
    // Utility functions for common checks
    isSm: breakpoint === "sm",
    isMd: breakpoint === "md",
    isLg: breakpoint === "lg",
    isXl: breakpoint === "xl",
    is2Xl: breakpoint === "2xl",
    // Range checks
    isLessThanMd: safeMaxWidth < BREAKPOINTS.md,
    isLessThanLg: safeMaxWidth < BREAKPOINTS.lg,
    isLessThanXl: safeMaxWidth < BREAKPOINTS.xl,
    isLessThan2Xl: safeMaxWidth < BREAKPOINTS["2xl"],
    // Up checks
    isMdOrMore: safeMinWidth >= BREAKPOINTS.md,
    isLgOrMore: safeMinWidth >= BREAKPOINTS.lg,
    isXlOrMore: safeMinWidth >= BREAKPOINTS.xl,
    is2XlOrMore: safeMinWidth >= BREAKPOINTS["2xl"],
  };
};
