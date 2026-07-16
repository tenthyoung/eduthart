"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionContainerProps {
  children: ReactNode;
  className?: string;
  bgColor?: string; // e.g., "bg-background", "bg-primary", "bg-muted/30"
  fullHeight?: boolean; // Makes section full screen height
}

/**
 * Reusable section container component
 * - Automatically adds top padding to avoid navbar overlap
 * - Full width container
 * - Customizable background color
 * - Optional full height
 */
export function SectionContainer({
  children,
  className = "",
  bgColor = "bg-background",
  fullHeight = false,
}: SectionContainerProps) {
  return (
    <section
      className={cn(
        "w-full pt-20", // pt-20 accounts for navbar height (80px)
        fullHeight ? "min-h-screen" : "py-16 lg:py-24",
        bgColor,
        className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}
