"use client";

import { useTailwindBreakpoint } from "@/hooks";
import { cn } from "@/lib/utils";
import type { SpringOptions } from "motion/react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { useRef } from "react";

interface TiltedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  containerHeight?: React.CSSProperties["height"];
  containerWidth?: React.CSSProperties["width"];
  scaleOnHover?: number;
  rotateAmplitude?: number;
  disableOnMobile?: boolean;
  showMobileWarning?: boolean;
  disabled?: boolean;
}

const springValues: SpringOptions = {
  damping: 30,
  stiffness: 100,
  mass: 2,
};

export default function TiltedCard({
  children,
  className,
  containerHeight = "auto",
  containerWidth = "100%",
  scaleOnHover = 1.05,
  rotateAmplitude = 8,
  disableOnMobile = true,
  showMobileWarning = false,
  disabled = false,
  ...props
}: TiltedCardProps) {
  const { isMobile } = useTailwindBreakpoint();
  const isEffectDisabled = disabled || (disableOnMobile && isMobile);

  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(useMotionValue(0), springValues);
  const rotateY = useSpring(useMotionValue(0), springValues);
  const scale = useSpring(1, springValues);

  function handleMouse(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current || isEffectDisabled) return;

    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    const rotationX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
    const rotationY = (offsetX / (rect.width / 2)) * rotateAmplitude;

    rotateX.set(rotationX);
    rotateY.set(rotationY);
  }

  function handleMouseEnter() {
    if (isEffectDisabled) return;
    scale.set(scaleOnHover);
  }

  function handleMouseLeave() {
    if (isEffectDisabled) return;
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative w-full h-full transform-gpu transition-transform will-change-transform",
        !isEffectDisabled && "[perspective:800px]",
        className,
      )}
      style={{
        height: containerHeight,
        width: containerWidth,
      }}
      onMouseMove={isEffectDisabled ? undefined : handleMouse}
      onMouseEnter={isEffectDisabled ? undefined : handleMouseEnter}
      onMouseLeave={isEffectDisabled ? undefined : handleMouseLeave}
      {...props}
    >
      {showMobileWarning && isMobile && (
        <div className="absolute top-4 text-center text-sm z-10">
          This effect is not optimized for mobile. Check on desktop.
        </div>
      )}

      <motion.div
        className="relative w-full h-full [transform-style:preserve-3d]"
        style={{
          rotateX: isEffectDisabled ? 0 : rotateX,
          rotateY: isEffectDisabled ? 0 : rotateY,
          scale: isEffectDisabled ? 1 : scale,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export { TiltedCard };
export type { TiltedCardProps };
