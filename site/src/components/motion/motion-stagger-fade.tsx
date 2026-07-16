"use client";

import { motion, useInView } from "motion/react";
import { ReactNode, useRef } from "react";

type Direction = "row" | "column";

interface MotionStaggerFadeProps {
  children: ReactNode | ReactNode[];
  delay?: number; // delay between each item
  duration?: number;
  initialDelay?: number;
  direction?: Direction;
  once?: boolean;
  className?: string;
  align?: "start" | "center" | "end" | "stretch";
  gap?: string;
}

export const MotionStaggerFade = ({
  children,
  delay = 0.3,
  duration = 0.4,
  initialDelay = 0.5,
  direction = "column",
  once = true,
  className = "",
}: MotionStaggerFadeProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once });

  // Convert children to array if it's not already
  const childrenArray = Array.isArray(children) ? children : [children];

  return (
    <div ref={ref} className={className}>
      {childrenArray.map((child, i) => (
        <motion.div
          key={i}
          initial={
            direction === "row" ? { opacity: 0, x: 12 } : { opacity: 0, y: 12 }
          }
          animate={
            isInView
              ? { opacity: 1, x: 0, y: 0 }
              : direction === "row"
                ? { opacity: 0, x: 12 }
                : { opacity: 0, y: 12 }
          }
          transition={{
            delay: initialDelay + i * delay,
            duration,
            ease: "easeOut",
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
};
