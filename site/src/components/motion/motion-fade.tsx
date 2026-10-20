"use client";

import { ReactNode } from "react";
import type { CSSProperties } from "react";
import { useInView } from "./use-in-view";

type Direction = "row" | "column";

/**
 * Fades its children in, and slides them a short way, once they scroll into
 * view. The timing and offset are custom properties `.motion-fade` in
 * tokens.css reads; an IntersectionObserver flips `data-in-view`.
 *
 * This replaced a 120KB animation library whose only job on these pages was an
 * opacity and a 12px slide.
 */
export const MotionFade = ({
  children,
  delay = 0.3,
  duration = 0.4,
  direction = "column",
  once = true,
  className = "",
}: {
  children: ReactNode;
  /** Seconds before the fade starts once the block is in view. */
  delay?: number;
  duration?: number;
  /** Which way the children slide in from. */
  direction?: Direction;
  /** Fade once and stay, rather than re-fading on every pass. */
  once?: boolean;
  className?: string;
}) => {
  const [ref, inView] = useInView<HTMLDivElement>(once);

  return (
    <div ref={ref} className={className}>
      <div
        className="motion-fade"
        data-in-view={inView ? "" : undefined}
        style={
          {
            "--fade-duration": `${duration}s`,
            "--fade-delay": `${delay}s`,
            "--fade-offset": direction === "row" ? "12px 0" : "0 12px",
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
};
