"use client";
import { MouseEvent, useCallback, useState } from "react";

interface TiltConfig {
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  speed?: number;
}

interface TiltState {
  x: number;
  y: number;
}

export const useTilt = (config: TiltConfig = {}) => {
  const {
    maxTilt = 15,
    perspective = 1000,
    scale = 1.05,
    speed = 300,
  } = config;

  const [tilt, setTilt] = useState<TiltState>({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      const element = e.currentTarget;
      const rect = element.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const rotateX = ((mouseY - centerY) / (rect.height / 2)) * maxTilt;
      const rotateY = ((centerX - mouseX) / (rect.width / 2)) * maxTilt;

      setTilt({ x: rotateX, y: rotateY });
    },
    [maxTilt],
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const tiltStyle = {
    transform: `perspective(${perspective}px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${scale}, ${scale}, 1)`,
    transition: `transform ${speed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`,
  };

  const resetStyle = {
    transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
    transition: `transform ${speed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`,
  };

  return {
    tiltProps: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
      style: tilt.x === 0 && tilt.y === 0 ? resetStyle : tiltStyle,
    },
    tilt,
  };
};
