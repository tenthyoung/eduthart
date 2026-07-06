"use client";

import {
  useEffect,
  useRef,
  createContext,
  useContext,
  ReactNode,
  useState,
} from "react";

interface ScrollObject {
  scroll: { y: number };
  direction: string;
  speed: number;
}

interface LocomotiveScrollContextType {
  scroll: {
    on: (event: string, callback: (obj: ScrollObject) => void) => void;
    off: (event: string, callback: (obj: ScrollObject) => void) => void;
    update: () => void;
  } | null;
}

const LocomotiveScrollContext = createContext<LocomotiveScrollContextType>({
  scroll: null,
});

export const useLocomotiveScroll = () => {
  const context = useContext(LocomotiveScrollContext);
  if (!context) {
    throw new Error(
      "useLocomotiveScroll must be used within LocomotiveScrollProvider",
    );
  }
  return context.scroll;
};

export function LocomotiveScrollProvider({
  children,
}: {
  children: ReactNode;
}) {
  const scrollListeners = useRef<Set<(obj: ScrollObject) => void>>(new Set());
  const lastScrollRef = useRef<number>(0);
  const [scrollInstance] = useState(() => ({
    on: (event: string, callback: (obj: ScrollObject) => void) => {
      if (event === "scroll") {
        scrollListeners.current.add(callback);
      }
    },
    off: (event: string, callback: (obj: ScrollObject) => void) => {
      if (event === "scroll") {
        scrollListeners.current.delete(callback);
      }
    },
    update: () => {
      // Trigger all listeners with current scroll position
      const currentY = window.scrollY;
      const scrollObj: ScrollObject = {
        scroll: { y: currentY },
        direction: currentY > lastScrollRef.current ? "down" : "up",
        speed: Math.abs(currentY - lastScrollRef.current),
      };
      scrollListeners.current.forEach((listener) => listener(scrollObj));
      lastScrollRef.current = currentY;
    },
  }));

  useEffect(() => {
    let lastScroll = 0;

    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const direction = currentScroll > lastScroll ? "down" : "up";
      const speed = Math.abs(currentScroll - lastScroll);

      const scrollObj: ScrollObject = {
        scroll: { y: currentScroll },
        direction,
        speed,
      };

      scrollListeners.current.forEach((listener) => {
        try {
          listener(scrollObj);
        } catch (e) {
          console.error("Error in scroll listener:", e);
        }
      });

      lastScroll = currentScroll;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <LocomotiveScrollContext.Provider value={{ scroll: scrollInstance }}>
      {children}
    </LocomotiveScrollContext.Provider>
  );
}
