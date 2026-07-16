import { useEffect, useRef, useState } from "react";
import { useLocomotiveScroll } from "@/components/locomotive-scroll-provider";

interface UseStickeySectionOptions {
  offset?: number; // Offset from top in pixels
  duration?: number; // Duration to stay sticky in pixels
}

interface ScrollObject {
  scroll: {
    y: number;
  };
  direction: string;
  speed: number;
}

export const useStickySection = (options: UseStickeySectionOptions = {}) => {
  const { offset = 0, duration = 500 } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const scroll = useLocomotiveScroll();

  useEffect(() => {
    if (!scroll || !ref.current) return;

    const handleScroll = (scrollObject: ScrollObject) => {
      const element = ref.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const elementTop = rect.top + window.scrollY;
      const elementBottom = elementTop + element.offsetHeight;
      const viewportTop = scrollObject.scroll.y + offset;

      // Calculate progress of scroll through the sticky section
      if (viewportTop >= elementTop && viewportTop <= elementBottom) {
        const progressValue = (viewportTop - elementTop) / element.offsetHeight;
        setProgress(Math.max(0, Math.min(1, progressValue)));
      }
    };

    scroll.on("scroll", handleScroll);

    return () => {
      scroll.off("scroll", handleScroll);
    };
  }, [scroll, offset, duration]);

  return { ref, progress };
};
