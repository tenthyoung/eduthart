"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reports whether the element has scrolled into view, the way
 * `useInView` from motion/react did. An IntersectionObserver is enough for
 * what the fade wrappers ask of it, and it keeps the animation library off
 * pages whose only use for it was fading a section in.
 */
export function useInView<T extends HTMLElement>(once = true) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // No observer (old Safari, some test environments) means the content
    // should simply be visible rather than stuck at opacity 0.
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [once]);

  return [ref, inView] as const;
}
