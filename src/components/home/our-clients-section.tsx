"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { MotionStaggerFade } from "../motion/motion-stagger-fade";
import { Heading } from "../text/heading";

function useElementWidth(ref: React.RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    function updateWidth() {
      if (ref.current) {
        setWidth(ref.current.offsetWidth);
      }
    }
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [ref]);

  return width;
}

interface ScrollVelocityProps {
  brands: string[];
  velocity?: number;
  numCopies?: number;
}

const ScrollVelocity = ({
  brands,
  velocity = 50,
  numCopies = 8,
}: ScrollVelocityProps) => {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
  });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
    clamp: false,
  });

  const copyRef = useRef<HTMLDivElement>(null);
  const copyWidth = useElementWidth(copyRef);

  function wrap(min: number, max: number, v: number) {
    const range = max - min;
    const mod = (((v - min) % range) + range) % range;
    return mod + min;
  }

  const x = useTransform(baseX, (v) => {
    if (copyWidth === 0) return "0px";
    return `${wrap(-copyWidth, 0, v)}px`;
  });

  const directionFactor = useRef(1);
  useAnimationFrame((t, delta) => {
    let moveBy = directionFactor.current * velocity * (delta / 1000);

    if (velocityFactor.get() < 0) {
      directionFactor.current = -1;
    } else if (velocityFactor.get() > 0) {
      directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  const brandElements = [];
  for (let i = 0; i < numCopies; i++) {
    brandElements.push(
      <div
        key={i}
        ref={i === 0 ? copyRef : null}
        className="flex items-center space-x-16 whitespace-nowrap"
      >
        {brands.map((brand, index) => (
          <span
            key={`${i}-${index}`}
            className="text-2xl md:text-3xl font-bold text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            {brand}
          </span>
        ))}
      </div>,
    );
  }

  return (
    <div className="overflow-hidden py-8">
      <motion.div className="flex items-center space-x-16" style={{ x }}>
        {brandElements}
      </motion.div>
    </div>
  );
};

export const OurClientsSection = () => {
  const clientBrands = [
    "TNC",
    "Limitless Fitness",
    "Should2Shoulder Ministries",
    "Amazon",
    "Tesla",
    "Boeing",
    "Lockheed Martin",
    "General Dynamics",
    "Raytheon",
    "Northrop Grumman",
    "Caterpillar",
    "John Deere",
    "Dow",
    "3M Company",
  ];

  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Section Header */}
        <MotionStaggerFade className="text-center mb-16">
          <Heading variant="h2">
            Who We&apos;re Built <span className="text-primary">For</span>
          </Heading>
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            EduthArt is designed for ambitious learners, modern teams, and
            organizations that care about long-term knowledge retention.
          </p>
          <div className="relative">
            {/* Top Row - Left to Right */}
            <ScrollVelocity brands={clientBrands.slice(0, 7)} velocity={30} />

            {/* Bottom Row - Right to Left */}
            <ScrollVelocity brands={clientBrands.slice(7)} velocity={-25} />
          </div>
        </MotionStaggerFade>
      </div>
    </section>
  );
};
