"use client";

import { ReactNode } from "react";
import type { CSSProperties } from "react";
import { useInView } from "./use-in-view";

type Direction = "row" | "column";

/** The same fade as MotionFade, dealt out one child at a time. */
export const MotionStaggerFade = ({
  children,
  delay = 0.3,
  duration = 0.4,
  initialDelay = 0.5,
  direction = "column",
  once = true,
  className = "",
}: {
  children: ReactNode | ReactNode[];
  /** Seconds between one child's fade and the next. */
  delay?: number;
  duration?: number;
  /** Seconds before the first child starts. */
  initialDelay?: number;
  direction?: Direction;
  once?: boolean;
  className?: string;
}) => {
  const [ref, inView] = useInView<HTMLDivElement>(once);
  const childrenArray = Array.isArray(children) ? children : [children];

  return (
    <div ref={ref} className={className}>
      {childrenArray.map((child, i) => (
        <div
          key={i}
          className="motion-fade"
          data-in-view={inView ? "" : undefined}
          style={
            {
              "--fade-duration": `${duration}s`,
              "--fade-delay": `${initialDelay + i * delay}s`,
              "--fade-offset": direction === "row" ? "12px 0" : "0 12px",
            } as CSSProperties
          }
        >
          {child}
        </div>
      ))}
    </div>
  );
};
