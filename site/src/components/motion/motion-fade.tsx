"use client";

import { motion, useInView } from "motion/react";
import { ReactNode, useRef } from "react";

type Direction = "row" | "column";

interface MotionStaggerFadeProps {
  children: ReactNode;
  delay?: number; // delay between each item
  duration?: number;
  initialDelay?: number;
  direction?: Direction;
  once?: boolean;
  className?: string;
  align?: "start" | "center" | "end" | "stretch";
  gap?: string;
}

export const MotionFade = ({
  children,
  delay = 0.3,
  duration = 0.4,
  direction = "column",
  once = true,
  className = "",
}: MotionStaggerFadeProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once });

  return (
    <div ref={ref} className={className}>
      <motion.div
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
          delay: delay,
          duration,
          ease: "easeOut",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};
